import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Promotion lifecycle management.
 *
 * Flow:
 * 1. Landlord donates 250 MXN to "Raíces de Vida" school
 * 2. Landlord sends donation receipt (photo) via WhatsApp
 * 3. Admin reviews receipt in admin panel
 * 4. Admin approves → listing gets "Community Supporter" badge for 30 days
 * 5. After 30 days, cron job auto-expires the promotion
 */

const PROMOTION_DURATION_DAYS = 30;

/**
 * Create a pending promotion request (receipt uploaded, awaiting admin approval)
 */
export async function createPromotionRequest(
  listingId: string,
  receiptUrl: string
): Promise<void> {
  await prisma.promotion.upsert({
    where: { listingId },
    create: {
      listingId,
      isPromoted: false,
      donationReceiptUrl: receiptUrl,
    },
    update: {
      donationReceiptUrl: receiptUrl,
      isPromoted: false,
      promotedAt: null,
      expiresAt: null,
      approvedBy: null,
    },
  });
}

/**
 * Admin approves a donation → activate 30-day promotion
 */
export async function approvePromotion(
  listingId: string,
  adminId: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROMOTION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.promotion.update({
    where: { listingId },
    data: {
      isPromoted: true,
      promotedAt: now,
      expiresAt,
      approvedBy: adminId,
    },
  });
}

/**
 * Admin rejects a donation request
 */
export async function rejectPromotion(listingId: string): Promise<void> {
  await prisma.promotion.delete({
    where: { listingId },
  });
}

/**
 * Expire all promotions that have passed their 30-day window.
 * Called by cron job every hour.
 * Returns the number of expired promotions.
 */
export async function expirePromotions(): Promise<number> {
  const now = new Date();

  const result = await prisma.promotion.updateMany({
    where: {
      isPromoted: true,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      isPromoted: false,
    },
  });

  if (result.count > 0) {
    console.log(`[Promotion Cron] Expired ${result.count} promotions at ${now.toISOString()}`);
  }

  return result.count;
}

/**
 * Get promotion status for a listing
 */
export async function getPromotionStatus(listingId: string) {
  return prisma.promotion.findUnique({
    where: { listingId },
  });
}

/**
 * Get all pending promotion requests (for admin panel)
 */
export async function getPendingPromotions() {
  return prisma.promotion.findMany({
    where: {
      isPromoted: false,
      donationReceiptUrl: { not: null },
      approvedBy: null,
    },
    include: {
      listing: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
