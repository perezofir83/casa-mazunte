'use client';

import Link from 'next/link';
import { Listing, formatPrice, formatPropertyType, formatDateRange } from '@/lib/api';

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const p = listing.parsedData;
  if (!p) return null;

  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="listing-card group cursor-pointer">
        {/* Image */}
        <div className="relative aspect-[20/19] rounded-xl overflow-hidden bg-gray-100">
          {listing.images.length > 0 ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${listing.images[0].url}`}
              alt={p.summary_es}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          )}

          {/* Promoted badge */}
          {listing.isPromoted && (
            <div className="absolute top-3 left-3 promoted-badge">
              Community Supporter
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="mt-3">
          {/* Location */}
          <h3 className="font-semibold text-[15px] text-gray-900 truncate">
            {p.location || 'Costa Oaxaquena'}
          </h3>

          {/* Property type + specs */}
          <p className="text-sm text-gray-500 mt-0.5">
            {formatPropertyType(p.property_type)}
            {p.bedrooms !== null && <> &middot; {p.bedrooms} rec.</>}
            {p.bathrooms !== null && <> &middot; {p.bathrooms} {p.bathrooms > 1 ? 'banos' : 'bano'}</>}
          </p>

          {/* Date availability */}
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDateRange(p.dates_available)}
          </p>

          {/* Price */}
          <p className="mt-1.5">
            <span className="font-semibold text-[15px] text-gray-900">
              {formatPrice(p.price, p.currency)}
            </span>
            <span className="text-sm text-gray-500 font-normal"> /mes</span>
          </p>

          {/* Long stay discount */}
          {p.long_stay_discount && (
            <p className="text-sm text-gray-500 mt-0.5 underline">
              Descuento larga estancia
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
