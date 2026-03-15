/**
 * Owner Routes - /api/owner
 *
 * Authentication flow:
 * 1. POST /request-otp  → sends 6-digit code to WhatsApp
 * 2. POST /verify-otp   → validates code, returns JWT
 * 3. All other routes   → require Bearer JWT (requireOwner)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { requireOwner } from '../middleware/ownerAuth';
import { validate } from '../middleware/validate';
import { hashPhone, encryptPhone } from '../services/phoneHasher';
import { createOTP, verifyOTP } from '../services/otpService';
import { sendOwnerOTP } from '../services/notifier';
import { safeParseListingText } from '../services/llmParser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Demasiados intentos, espera 15 minutos' },
});

// --- Validation Schemas ---

const requestOtpSchema = z.object({
  phone: z.string().min(8).max(20),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

const editListingSchema = z.object({
  rawText: z.string().min(10).max(5000).optional(),
  name: z.string().max(100).optional(),
});

const availabilitySchema = z.object({
  blocks: z.array(z.object({
    dateFrom: z.string().datetime(),
    dateTo: z.string().datetime(),
  })),
});

// --- Media upload ---

const uploadsDir = path.resolve(env.IMAGE_LOCAL_PATH || './uploads');
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (for video)
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, WebP, MP4.'));
    }
  },
});

// ==============================
// POST /api/owner/request-otp
// ==============================
router.post(
  '/request-otp',
  otpLimiter,
  validate(requestOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.body as { phone: string };

    try {
      const code = await createOTP(phone);
      await sendOwnerOTP(phone, code);

      res.json({
        success: true,
        data: { message: 'Código enviado por WhatsApp' },
      });
    } catch (err) {
      console.error('[Owner OTP] Error sending OTP:', err);
      res.status(500).json({ success: false, error: 'No se pudo enviar el código' });
    }
  }
);

// ==============================
// POST /api/owner/verify-otp
// ==============================
router.post(
  '/verify-otp',
  otpLimiter,
  validate(verifyOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { phone, code } = req.body as { phone: string; code: string };

    try {
      const valid = await verifyOTP(phone, code);

      if (!valid) {
        res.status(401).json({ success: false, error: 'Código incorrecto o expirado' });
        return;
      }

      // Find or create owner
      const phoneHash = await hashPhone(phone);
      const phoneEnc = encryptPhone(phone);

      let owner = await prisma.owner.findUnique({ where: { phoneHash } });

      if (!owner) {
        owner = await prisma.owner.create({
          data: { phoneHash, phoneEnc },
        });
      } else {
        await prisma.owner.update({
          where: { id: owner.id },
          data: { lastLogin: new Date() },
        });
      }

      // Issue JWT (8 hour expiry)
      const token = jwt.sign(
        { ownerId: owner.id, phone } satisfies { ownerId: string; phone: string },
        env.JWT_SECRET + '_owner',
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        data: { token, ownerId: owner.id },
      });
    } catch (err) {
      console.error('[Owner Auth] Error verifying OTP:', err);
      res.status(500).json({ success: false, error: 'Error de autenticación' });
    }
  }
);

// ==============================
// GET /api/owner/listings
// ==============================
router.get(
  '/listings',
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const listings = await prisma.listing.findMany({
        where: { ownerId: req.owner!.ownerId },
        include: {
          images: true,
          promotion: true,
          availability: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const data = listings.map((l) => ({
        ...l,
        parsedData: l.parsedData ? JSON.parse(l.parsedData) : null,
      }));

      res.json({ success: true, data });
    } catch (err) {
      console.error('[Owner] Error fetching listings:', err);
      res.status(500).json({ success: false, error: 'Error al cargar propiedades' });
    }
  }
);

// ==============================
// GET /api/owner/listings/:id
// ==============================
router.get(
  '/listings/:id',
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const listing = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
        include: { images: true, promotion: true, availability: true },
      });

      if (!listing) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...listing,
          parsedData: listing.parsedData ? JSON.parse(listing.parsedData) : null,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al cargar propiedad' });
    }
  }
);

// ==============================
// PATCH /api/owner/listings/:id
// ==============================
router.patch(
  '/listings/:id',
  requireOwner,
  validate(editListingSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { rawText, name } = req.body as { rawText?: string; name?: string };

    try {
      const listing = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
      });

      if (!listing) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      // Update owner name if provided
      if (name !== undefined) {
        await prisma.owner.update({
          where: { id: req.owner!.ownerId },
          data: { name },
        });
      }

      // If text changed, re-parse with LLM
      if (rawText && rawText !== listing.rawText) {
        const updated = await prisma.listing.update({
          where: { id: listing.id },
          data: { rawText },
        });

        // Re-parse async
        safeParseListingText(rawText).then(async (parsed) => {
          if (parsed) {
            await prisma.listing.update({
              where: { id: listing.id },
              data: { parsedData: JSON.stringify(parsed) },
            });
          }
        });

        res.json({
          success: true,
          data: { ...updated, parsedData: listing.parsedData ? JSON.parse(listing.parsedData) : null },
        });
      } else {
        res.json({ success: true, data: { message: 'Actualizado' } });
      }
    } catch (err) {
      console.error('[Owner] Error updating listing:', err);
      res.status(500).json({ success: false, error: 'Error al actualizar' });
    }
  }
);

// ==============================
// POST /api/owner/listings/:id/approve
// ==============================
router.post(
  '/listings/:id/approve',
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const listing = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
      });

      if (!listing) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: { ownerApproved: true, status: 'ACTIVE' },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al aprobar' });
    }
  }
);

// ==============================
// POST /api/owner/listings/:id/media
// ==============================
router.post(
  '/listings/:id/media',
  requireOwner,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const listingWithMedia = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
        include: { images: true },
      });

      if (!listingWithMedia) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      const listing = listingWithMedia as typeof listingWithMedia & { images: { id: string; mediaType: string }[] };

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No se recibió archivo' });
        return;
      }

      const isVideo = req.file.mimetype === 'video/mp4';
      const mediaType = isVideo ? 'video' : 'image';

      // Count existing media
      const images = listing.images.filter((i: { mediaType: string }) => i.mediaType === 'image');
      const videos = listing.images.filter((i: { mediaType: string }) => i.mediaType === 'video');

      if (mediaType === 'image' && images.length >= 10) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, error: 'Máximo 10 fotos por propiedad' });
        return;
      }
      if (mediaType === 'video' && videos.length >= 1) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, error: 'Solo se permite 1 video por propiedad' });
        return;
      }

      // Move to listing directory
      const listingDir = path.join(uploadsDir, listing.id);
      fs.mkdirSync(listingDir, { recursive: true });

      const ext = isVideo ? 'mp4' : req.file.originalname.split('.').pop() || 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const destPath = path.join(listingDir, filename);
      fs.renameSync(req.file.path, destPath);

      const url = `/uploads/${listing.id}/${filename}`;

      const media = await prisma.image.create({
        data: {
          listingId: listing.id,
          url,
          storageKey: destPath,
          mediaType,
        },
      });

      res.status(201).json({ success: true, data: media });
    } catch (err) {
      console.error('[Owner] Error uploading media:', err);
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ success: false, error: 'Error al subir archivo' });
    }
  }
);

// ==============================
// DELETE /api/owner/listings/:id/media/:mediaId
// ==============================
router.delete(
  '/listings/:id/media/:mediaId',
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const listing = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
      });

      if (!listing) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      const media = await prisma.image.findFirst({
        where: { id: req.params.mediaId as string, listingId: listing.id },
      });

      if (!media) {
        res.status(404).json({ success: false, error: 'Archivo no encontrado' });
        return;
      }

      // Delete file from disk
      if (media.storageKey) {
        try { fs.unlinkSync(media.storageKey); } catch {}
      }

      await prisma.image.delete({ where: { id: media.id } });
      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Error al eliminar archivo' });
    }
  }
);

// ==============================
// PUT /api/owner/listings/:id/availability
// ==============================
router.put(
  '/listings/:id/availability',
  requireOwner,
  validate(availabilitySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { blocks } = req.body as { blocks: { dateFrom: string; dateTo: string }[] };

    try {
      const listing = await prisma.listing.findFirst({
        where: { id: req.params.id as string, ownerId: req.owner!.ownerId },
      });

      if (!listing) {
        res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
        return;
      }

      // Validate minimum 14 days per block
      const MIN_DAYS = 14;
      for (const block of blocks) {
        const from = new Date(block.dateFrom);
        const to = new Date(block.dateTo);
        const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < MIN_DAYS) {
          res.status(400).json({
            success: false,
            error: `Cada bloque debe tener mínimo ${MIN_DAYS} días (bloque ${from.toLocaleDateString('es-MX')} - ${to.toLocaleDateString('es-MX')} tiene ${Math.round(diffDays)} días)`,
          });
          return;
        }
        if (from >= to) {
          res.status(400).json({ success: false, error: 'La fecha de inicio debe ser antes que la fecha de fin' });
          return;
        }
      }

      // Replace all availability blocks
      await prisma.availabilityBlock.deleteMany({ where: { listingId: listing.id } });

      if (blocks.length > 0) {
        await prisma.availabilityBlock.createMany({
          data: blocks.map((b) => ({
            listingId: listing.id,
            dateFrom: new Date(b.dateFrom),
            dateTo: new Date(b.dateTo),
          })),
        });
      }

      const updated = await prisma.availabilityBlock.findMany({
        where: { listingId: listing.id },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[Owner] Error saving availability:', err);
      res.status(500).json({ success: false, error: 'Error al guardar disponibilidad' });
    }
  }
);

export default router;
