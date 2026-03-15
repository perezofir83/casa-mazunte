import cron from 'node-cron';
import { expirePromotions } from '../services/promotionService';

/**
 * Cron job: Check for expired promotions every hour.
 * Promotions last exactly 30 days from approval.
 * After expiry, listing loses "Community Supporter" badge and
 * reverts to normal position in search results.
 *
 * Schedule: Every hour at minute 0
 */
export function startPromotionExpiryCron(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await expirePromotions();
      if (expired > 0) {
        console.log(`[Cron] Expired ${expired} promotion(s)`);
      }
    } catch (error) {
      console.error('[Cron] Promotion expiry check failed:', error);
    }
  });

  console.log('[Cron] Promotion expiry job scheduled (every hour)');
}
