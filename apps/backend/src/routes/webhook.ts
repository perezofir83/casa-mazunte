import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { hashPhone, encryptPhone } from '../services/phoneHasher';
import { safeParseListingText } from '../services/llmParser';
import { sendLandlordConfirmation } from '../services/notifier';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/webhook/ultramsg
 * Receives inbound WhatsApp messages from landlords via Ultramsg.
 *
 * Ultramsg sends webhooks with this structure:
 * {
 *   "event_type": "message_received",
 *   "instanceId": "instanceXXX",
 *   "data": {
 *     "from": "5219581161795@c.us",
 *     "to": "your-number@c.us",
 *     "body": "message text",
 *     "type": "chat" | "image" | "document",
 *     "time": 1234567890,
 *     "id": "msg-id"
 *   }
 * }
 */
router.post('/ultramsg', async (req, res) => {
  try {
    // Verify webhook is from Ultramsg
    const { event_type, instanceId, data } = req.body;

    if (!env.ULTRAMSG_INSTANCE_ID || !env.ULTRAMSG_TOKEN) {
      res.status(503).json({ success: false, error: 'Ultramsg not configured' });
      return;
    }

    // Basic verification: check instance ID matches
    if (instanceId && instanceId !== env.ULTRAMSG_INSTANCE_ID) {
      console.warn(`[Webhook] Invalid instance ID: ${instanceId}`);
      res.status(403).json({ success: false, error: 'Invalid instance' });
      return;
    }

    if (!data || !data.from || !data.body) {
      res.status(400).json({ success: false, error: 'Invalid webhook payload' });
      return;
    }

    // Extract phone from WhatsApp ID format (5219581161795@c.us -> +5219581161795)
    const phone = '+' + data.from.replace('@c.us', '');
    const messageText = data.body;

    // Check for special commands
    if (messageText.trim().toUpperCase() === 'PARAR' || messageText.trim().toUpperCase() === 'STOP') {
      // Opt-out from notifications
      const phoneHash = await hashPhone(phone);
      await prisma.renterPreference.updateMany({
        where: { phoneHash },
        data: { isActive: false },
      });
      console.log(`[Webhook] Renter ${phone} opted out of notifications`);
      res.json({ success: true, data: { action: 'opted_out' } });
      return;
    }

    if (messageText.trim().toUpperCase().startsWith('BUSCO')) {
      // Renter preference registration - TODO: implement conversational flow
      console.log(`[Webhook] Renter search request from ${phone}: ${messageText}`);
      res.json({ success: true, data: { action: 'search_registered' } });
      return;
    }

    // Treat as a new listing submission
    const phoneHash = await hashPhone(phone);
    const phoneEnc = encryptPhone(phone);

    // Dedup check
    const existing = await prisma.listing.findFirst({
      where: {
        senderPhoneHash: phoneHash,
        rawText: messageText,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      console.log(`[Webhook] Duplicate listing from ${phone}`);
      res.json({ success: true, data: { action: 'duplicate' } });
      return;
    }

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        source: 'ULTRAMSG_INBOUND',
        status: 'PENDING_REVIEW',
        senderPhoneHash: phoneHash,
        senderPhoneEnc: phoneEnc,
        rawText: messageText,
      },
    });

    // Trigger async LLM parsing
    safeParseListingText(messageText)
      .then(async (parsed) => {
        if (parsed) {
          const newStatus = !parsed.is_rental || parsed.confidence_score < 0.3
            ? 'ARCHIVED'
            : 'PENDING_REVIEW';
          await prisma.listing.update({
            where: { id: listing.id },
            data: { parsedData: JSON.stringify(parsed), status: newStatus },
          });
        }
      })
      .catch((err) => console.error(`LLM parse failed for webhook listing ${listing.id}:`, err));

    // Send auto-reply confirmation
    sendLandlordConfirmation(phone).catch((err) =>
      console.error(`Failed to send confirmation to ${phone}:`, err)
    );

    console.log(`[Webhook] New listing from ${phone}, id: ${listing.id}`);
    res.json({ success: true, data: { action: 'listing_created', listingId: listing.id } });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

export default router;
