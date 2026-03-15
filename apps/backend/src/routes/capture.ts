import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireCaptureKey } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { captureLimiter } from '../config/security';
import { CapturePayloadSchema } from '../types';
import { hashPhone, encryptPhone } from '../services/phoneHasher';
import { saveImage } from '../services/imageService';
import { safeParseListingText } from '../services/llmParser';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/capture
 * Receives listing data from Chrome Extension / Claude in Chrome.
 * Protected by API key + rate limiting.
 *
 * Flow:
 * 1. Validate & sanitize input
 * 2. Hash & encrypt phone number
 * 3. Create listing with PENDING_REVIEW status
 * 4. Save images
 * 5. Trigger async LLM parsing
 */
router.post(
  '/',
  captureLimiter,
  requireCaptureKey,
  validate(CapturePayloadSchema),
  async (req, res) => {
    try {
      const { senderPhone, messageText, images, groupName, capturedAt } = req.body;

      // Hash phone for dedup check
      const phoneHash = await hashPhone(senderPhone);

      // Check for duplicate (same phone + similar text in last 24 hours)
      const existingListing = await prisma.listing.findFirst({
        where: {
          senderPhoneHash: phoneHash,
          rawText: messageText,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingListing) {
        res.status(409).json({
          success: false,
          error: 'Duplicate listing detected (same sender and text in last 24h)',
          data: { existingId: existingListing.id },
        });
        return;
      }

      // Encrypt phone for later decryption (wa.me link generation)
      const phoneEnc = encryptPhone(senderPhone);

      // Create listing
      const listing = await prisma.listing.create({
        data: {
          source: 'WHATSAPP_CAPTURE',
          status: 'PENDING_REVIEW',
          senderPhoneHash: phoneHash,
          senderPhoneEnc: phoneEnc,
          rawText: messageText,
          groupName: groupName || null,
        },
      });

      // Save images
      const savedImages = [];
      for (const imageData of images) {
        try {
          const saved = await saveImage(imageData, listing.id);
          const dbImage = await prisma.image.create({
            data: {
              id: saved.id,
              listingId: listing.id,
              url: saved.url,
              storageKey: saved.storageKey,
            },
          });
          savedImages.push(dbImage);
        } catch (imgError) {
          console.warn(`Failed to save image for listing ${listing.id}:`, imgError);
          // Continue - don't fail the whole capture for one bad image
        }
      }

      // Trigger async LLM parsing (non-blocking)
      parseListing(listing.id, messageText).catch((err) =>
        console.error(`LLM parsing failed for ${listing.id}:`, err)
      );

      res.status(201).json({
        success: true,
        data: {
          id: listing.id,
          status: listing.status,
          imagesCount: savedImages.length,
          message: 'Listing captured successfully. LLM parsing in progress.',
        },
      });
    } catch (error) {
      console.error('Capture error:', error);
      res.status(500).json({ success: false, error: 'Failed to capture listing' });
    }
  }
);

/**
 * Async LLM parsing - runs after response is sent to client.
 * Updates the listing with parsed data and adjusts status.
 */
async function parseListing(listingId: string, rawText: string): Promise<void> {
  const parsed = await safeParseListingText(rawText);

  if (!parsed) {
    console.warn(`Could not parse listing ${listingId} - keeping as PENDING_REVIEW`);
    return;
  }

  // Determine status based on parsing result
  let newStatus = 'PENDING_REVIEW';
  if (!parsed.is_rental || parsed.confidence_score < 0.3) {
    newStatus = 'ARCHIVED'; // Not a rental or very low confidence
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      parsedData: JSON.stringify(parsed),
      status: newStatus,
    },
  });

  console.log(
    `[Parser] Listing ${listingId}: confidence=${parsed.confidence_score}, ` +
    `is_rental=${parsed.is_rental}, status=${newStatus}, ` +
    `price=${parsed.price} ${parsed.currency}, location=${parsed.location}`
  );
}

export default router;
