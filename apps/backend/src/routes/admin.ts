import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginLimiter } from '../config/security';
import { AdminLoginSchema, PromotionApproveSchema } from '../types';
import { env } from '../config/env';
import {
  approvePromotion,
  rejectPromotion,
  getPendingPromotions,
} from '../services/promotionService';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// Auth
// ============================================

/**
 * POST /api/admin/login
 * Returns JWT token for admin authentication.
 */
router.post('/login', loginLimiter, validate(AdminLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const validPassword = await argon2.verify(admin.passwordHash, password);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ============================================
// Listing Management
// ============================================

/**
 * GET /api/admin/listings
 * List all listings with optional status filter.
 */
router.get('/listings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};

    const listings = await prisma.listing.findMany({
      where,
      include: {
        images: { select: { id: true, url: true } },
        promotion: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Parse JSON data for each listing
    const data = listings.map((l) => ({
      ...l,
      parsedData: l.parsedData ? JSON.parse(l.parsedData as string) : null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Admin listings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
});

/**
 * PATCH /api/admin/listings/:id
 * Update listing status or parsed data.
 * Used for: approve, reject, edit parsed data.
 */
router.patch('/listings/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, parsedData } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (parsedData) updateData.parsedData = JSON.stringify(parsedData);

    const listing = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Admin update listing error:', error);
    res.status(500).json({ success: false, error: 'Failed to update listing' });
  }
});

/**
 * DELETE /api/admin/listings/:id
 * Permanently delete a listing and its images.
 */
router.delete('/listings/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    await prisma.listing.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Listing deleted' } });
  } catch (error) {
    console.error('Admin delete listing error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete listing' });
  }
});

// ============================================
// Promotion Management
// ============================================

/**
 * GET /api/admin/promotions
 * List pending promotion requests (donation receipts awaiting approval)
 */
router.get('/promotions', requireAdmin, async (_req, res) => {
  try {
    const promotions = await getPendingPromotions();
    res.json({ success: true, data: promotions });
  } catch (error) {
    console.error('Admin promotions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch promotions' });
  }
});

/**
 * POST /api/admin/promotions/:listingId/approve
 * Approve a donation and activate 30-day promotion.
 */
router.post('/promotions/:listingId/approve', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.params;
    await approvePromotion(listingId, req.admin!.id);

    res.json({
      success: true,
      data: { message: 'Promotion approved. Listing will be promoted for 30 days.' },
    });
  } catch (error) {
    console.error('Approve promotion error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve promotion' });
  }
});

/**
 * POST /api/admin/promotions/:listingId/reject
 * Reject a donation request.
 */
router.post('/promotions/:listingId/reject', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.params;
    await rejectPromotion(listingId);
    res.json({ success: true, data: { message: 'Promotion rejected.' } });
  } catch (error) {
    console.error('Reject promotion error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject promotion' });
  }
});

// ============================================
// Dashboard Stats
// ============================================

/**
 * GET /api/admin/stats
 * Basic analytics for the admin dashboard.
 */
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [total, pending, active, promoted] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.promotion.count({ where: { isPromoted: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalListings: total,
        pendingReview: pending,
        activeListings: active,
        promotedListings: promoted,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
