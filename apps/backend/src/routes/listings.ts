import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate } from '../middleware/validate';
import { ListingsQuerySchema, ListingResponse, ApiResponse } from '../types';
import { generateWhatsAppLink } from '../services/phoneHasher';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/listings
 * Public endpoint - returns active listings with filtering.
 * Promoted listings are always returned first.
 */
router.get('/', validate(ListingsQuerySchema, 'query'), async (req, res) => {
  try {
    const query = req.query as any;
    const { minPrice, maxPrice, location, minBedrooms, propertyType, cursor, limit } = query;

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
    };

    // Fetch listings with promotion data
    const listings = await prisma.listing.findMany({
      where,
      include: {
        images: {
          select: { id: true, url: true },
        },
        promotion: {
          select: {
            isPromoted: true,
            expiresAt: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit + 1, // Fetch one extra to detect "hasMore"
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Check if there are more results
    const hasMore = listings.length > limit;
    const results = hasMore ? listings.slice(0, limit) : listings;

    // Apply in-memory filters on parsedData (JSON stored as string in SQLite)
    const filtered = results.filter((listing) => {
      if (!listing.parsedData) return true; // Show listings without parsed data too

      let parsed: any;
      try {
        parsed = typeof listing.parsedData === 'string'
          ? JSON.parse(listing.parsedData)
          : listing.parsedData;
      } catch {
        return true;
      }

      if (minPrice && parsed.price && parsed.price < minPrice) return false;
      if (maxPrice && parsed.price && parsed.price > maxPrice) return false;
      if (minBedrooms && parsed.bedrooms && parsed.bedrooms < minBedrooms) return false;
      if (location && parsed.location && !parsed.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (propertyType && parsed.property_type && parsed.property_type !== propertyType) return false;

      return true;
    });

    // Sort: promoted first, then by date
    const sorted = filtered.sort((a, b) => {
      const aPromoted = a.promotion?.isPromoted ? 1 : 0;
      const bPromoted = b.promotion?.isPromoted ? 1 : 0;
      if (aPromoted !== bPromoted) return bPromoted - aPromoted;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Transform to response format
    const response: ListingResponse[] = sorted.map((listing) => {
      let parsedData = null;
      try {
        parsedData = listing.parsedData
          ? typeof listing.parsedData === 'string'
            ? JSON.parse(listing.parsedData)
            : listing.parsedData
          : null;
      } catch {
        parsedData = null;
      }

      // Generate WhatsApp contact link (phone is decrypted server-side only)
      let contactUrl = '#';
      if (listing.senderPhoneEnc) {
        try {
          contactUrl = generateWhatsAppLink(listing.senderPhoneEnc, listing.id);
        } catch {
          contactUrl = '#';
        }
      }

      return {
        id: listing.id,
        source: listing.source,
        status: listing.status,
        rawText: listing.rawText,
        parsedData,
        images: listing.images,
        isPromoted: listing.promotion?.isPromoted ?? false,
        promotedBadge: listing.promotion?.isPromoted ?? false,
        promotionExpiresAt: listing.promotion?.expiresAt?.toISOString() ?? null,
        contactUrl,
        createdAt: listing.createdAt.toISOString(),
      };
    });

    const apiResponse: ApiResponse<ListingResponse[]> = {
      success: true,
      data: response,
      pagination: {
        nextCursor: hasMore ? results[results.length - 1].id : null,
        hasMore,
      },
    };

    res.json(apiResponse);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/listings/:id
 * Public endpoint - returns a single listing by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id, status: 'ACTIVE' },
      include: {
        images: { select: { id: true, url: true } },
        promotion: { select: { isPromoted: true, expiresAt: true } },
      },
    });

    if (!listing) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    let parsedData = null;
    try {
      parsedData = listing.parsedData
        ? typeof listing.parsedData === 'string'
          ? JSON.parse(listing.parsedData)
          : listing.parsedData
        : null;
    } catch {
      parsedData = null;
    }

    let contactUrl = '#';
    if (listing.senderPhoneEnc) {
      try {
        contactUrl = generateWhatsAppLink(listing.senderPhoneEnc, listing.id);
      } catch {
        contactUrl = '#';
      }
    }

    const response: ListingResponse = {
      id: listing.id,
      source: listing.source,
      status: listing.status,
      rawText: listing.rawText,
      parsedData,
      images: listing.images,
      isPromoted: listing.promotion?.isPromoted ?? false,
      promotedBadge: listing.promotion?.isPromoted ?? false,
      promotionExpiresAt: listing.promotion?.expiresAt?.toISOString() ?? null,
      contactUrl,
      createdAt: listing.createdAt.toISOString(),
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
