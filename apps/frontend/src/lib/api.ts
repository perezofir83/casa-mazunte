/**
 * API client for Casa Mazunte backend.
 * All requests go through this module.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ParsedListing {
  is_rental: boolean;
  confidence_score: number;
  price: number | null;
  currency: 'MXN' | 'USD';
  price_period: string;
  long_stay_discount: boolean;
  location: string | null;
  neighborhood: string | null;
  property_type: string | null;
  bedrooms: number | null;
  beds: { type: string; room?: string }[];
  bathrooms: number | null;
  capacity: number | null;
  dates_available: { from: string | null; to: string | null } | null;
  amenities: string[];
  missing_amenities_common: string[];
  summary_es: string;
  summary_en: string;
  quality_notes: string[];
}

export interface Listing {
  id: string;
  source: string;
  status: string;
  rawText: string;
  parsedData: ParsedListing | null;
  images: { id: string; url: string }[];
  isPromoted: boolean;
  promotedBadge: boolean;
  promotionExpiresAt: string | null;
  contactUrl: string;
  createdAt: string;
}

export interface ListingsResponse {
  success: boolean;
  data: Listing[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface ListingsFilters {
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  minBedrooms?: number;
  propertyType?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Fetch active listings with optional filters
 */
export async function fetchListings(filters: ListingsFilters = {}): Promise<ListingsResponse> {
  const params = new URLSearchParams();
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.location) params.set('location', filters.location);
  if (filters.minBedrooms) params.set('minBedrooms', String(filters.minBedrooms));
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);

  const res = await fetch(`${API_URL}/api/listings?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single listing by ID
 */
export async function fetchListing(id: string): Promise<{ success: boolean; data: Listing }> {
  const res = await fetch(`${API_URL}/api/listings/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null, currency: string = 'MXN'): string {
  if (!price) return 'Precio no especificado';
  return `$${price.toLocaleString('es-MX')} ${currency}`;
}

/**
 * Format amenity name for display (snake_case -> readable)
 */
export function formatAmenity(amenity: string): string {
  const map: Record<string, string> = {
    cocina_equipada: '🍳 Cocina equipada',
    internet_wifi: '📶 WiFi',
    aire_acondicionado: '❄️ A/C',
    ventilador: '🌀 Ventilador',
    terraza: '🌿 Terraza',
    balcon: '🏗️ Balcón',
    estacionamiento: '🅿️ Estacionamiento',
    lavadora: '🧺 Lavadora',
    agua_caliente: '🚿 Agua caliente',
    alberca: '🏊 Alberca',
    jardin: '🌳 Jardín',
    mascotas_permitidas: '🐕 Mascotas OK',
    amueblado: '🛋️ Amueblado',
    mosquiteros: '🦟 Mosquiteros',
    vista_al_mar: '🌊 Vista al mar',
    gas: '🔥 Gas',
    tinaco: '💧 Tinaco',
  };
  return map[amenity] || amenity.replace(/_/g, ' ');
}

/**
 * Format property type
 */
export function formatPropertyType(type: string | null): string {
  const map: Record<string, string> = {
    departamento: 'Departamento',
    casa: 'Casa',
    cuarto: 'Cuarto',
    estudio: 'Estudio',
    cabana: 'Cabaña',
    bungalow: 'Bungalow',
    loft: 'Loft',
  };
  return type ? map[type] || type : 'Propiedad';
}

/**
 * Format date range
 */
export function formatDateRange(dates: { from: string | null; to: string | null } | null): string {
  if (!dates) return 'Consultar disponibilidad';
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  const from = dates.from ? new Date(dates.from).toLocaleDateString('es-MX', options) : null;
  const to = dates.to ? new Date(dates.to).toLocaleDateString('es-MX', options) : null;

  if (from && to) return `${from} - ${to}`;
  if (from) return `Desde ${from}`;
  return 'Disponible ahora';
}
