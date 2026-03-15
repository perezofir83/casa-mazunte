import { z } from 'zod';

// ============================================
// Parsed Listing Data (output from Claude LLM)
// ============================================

export const BedSchema = z.object({
  type: z.string(), // king_size, queen, individual, sofa_cama, litera
  room: z.string().optional(),
});

export const DatesAvailableSchema = z.object({
  from: z.string().nullable(), // ISO 8601 date
  to: z.string().nullable(),
});

export const ParsedListingSchema = z.object({
  is_rental: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  price: z.number().nullable(),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  price_period: z.enum(['monthly', 'weekly', 'daily', 'nightly']).default('monthly'),
  long_stay_discount: z.boolean().default(false),
  location: z.string().nullable(),
  neighborhood: z.string().nullable(),
  property_type: z.string().nullable(), // departamento, casa, cuarto, estudio, cabana
  bedrooms: z.number().nullable(),
  beds: z.array(BedSchema).default([]),
  bathrooms: z.number().nullable(),
  capacity: z.number().nullable(),
  dates_available: DatesAvailableSchema.nullable(),
  amenities: z.array(z.string()).default([]),
  missing_amenities_common: z.array(z.string()).default([]),
  summary_es: z.string(),
  summary_en: z.string(),
  quality_notes: z.array(z.string()).default([]),
});

export type ParsedListing = z.infer<typeof ParsedListingSchema>;

// ============================================
// API Request Schemas
// ============================================

export const CapturePayloadSchema = z.object({
  senderPhone: z.string().min(8).max(20),
  messageText: z.string().min(10).max(5000),
  images: z.array(z.string()).default([]), // base64 or URLs
  groupName: z.string().optional(),
  capturedAt: z.string().optional(),
});

export type CapturePayload = z.infer<typeof CapturePayloadSchema>;

export const ListingsQuerySchema = z.object({
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  location: z.string().optional(),
  minBedrooms: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type ListingsQuery = z.infer<typeof ListingsQuerySchema>;

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const PromotionApproveSchema = z.object({
  listingId: z.string().uuid(),
});

// ============================================
// API Response Types
// ============================================

export interface ListingResponse {
  id: string;
  source: string;
  status: string;
  rawText: string;
  parsedData: ParsedListing | null;
  images: { id: string; url: string }[];
  isPromoted: boolean;
  promotedBadge: boolean;
  promotionExpiresAt: string | null;
  contactUrl: string; // wa.me link (never raw phone)
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
