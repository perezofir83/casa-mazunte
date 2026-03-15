'use client';

import Link from 'next/link';
import { Listing, formatPrice, formatPropertyType, formatAmenity, formatDateRange } from '@/lib/api';

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const p = listing.parsedData;
  if (!p) return null;

  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="listing-card bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 cursor-pointer">
        {/* Image placeholder or first image */}
        <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-amber-50 flex items-center justify-center">
          {listing.images.length > 0 ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${listing.images[0].url}`}
              alt={p.summary_es}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">🏠</span>
          )}

          {/* Promoted badge */}
          {listing.isPromoted && (
            <div className="absolute top-3 left-3 promoted-badge">
              ⭐ Community Supporter
            </div>
          )}

          {/* Price tag */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm">
            <span className="font-bold text-lg text-emerald-800">
              {formatPrice(p.price, p.currency)}
            </span>
            <span className="text-xs text-gray-500 ml-1">/mes</span>
          </div>

          {/* Image count */}
          {listing.images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
              📷 {listing.images.length} fotos
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Location and type */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-base text-gray-800">
              📍 {p.location || 'Ubicación no especificada'}
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-medium">
              {formatPropertyType(p.property_type)}
            </span>
          </div>

          {/* Key details */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            {p.bedrooms !== null && (
              <span>🛏️ {p.bedrooms} rec.</span>
            )}
            {p.bathrooms !== null && (
              <span>🚿 {p.bathrooms} baño{p.bathrooms > 1 ? 's' : ''}</span>
            )}
            {p.capacity !== null && (
              <span>👥 {p.capacity} pers.</span>
            )}
            {p.long_stay_discount && (
              <span className="text-amber-600 font-medium">💰 Desc. larga estancia</span>
            )}
          </div>

          {/* Summary */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {p.summary_es}
          </p>

          {/* Top amenities (max 4) */}
          <div className="flex flex-wrap gap-1.5">
            {p.amenities.slice(0, 4).map((a) => (
              <span key={a} className="amenity-tag text-xs">
                {formatAmenity(a)}
              </span>
            ))}
            {p.amenities.length > 4 && (
              <span className="text-xs text-gray-400 self-center">
                +{p.amenities.length - 4} más
              </span>
            )}
          </div>

          {/* Date availability */}
          <div className="mt-3 text-xs text-gray-500">
            📅 {formatDateRange(p.dates_available)}
          </div>
        </div>
      </div>
    </Link>
  );
}
