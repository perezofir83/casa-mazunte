'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchListing, Listing, formatPrice, formatPropertyType, formatAmenity, formatDateRange } from '@/lib/api';
import WhatsAppButton from '@/components/WhatsAppButton';

export default function ListingDetailPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchListing(params.id as string);
        setListing(res.data);
      } catch (err) {
        setError('No se pudo cargar la propiedad.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 md:px-10 py-8 animate-pulse">
        <div className="aspect-[16/9] bg-gray-200 rounded-xl mb-6" />
        <div className="h-7 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !listing || !listing.parsedData) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 md:px-10 py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Propiedad no encontrada</h2>
        <p className="text-gray-500 mb-6">{error || 'Esta propiedad ya no esta disponible.'}</p>
        <Link
          href="/"
          className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Volver a propiedades
        </Link>
      </div>
    );
  }

  const p = listing.parsedData;

  return (
    <div className="max-w-[1120px] mx-auto px-6 md:px-10 py-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-900 hover:underline mb-6 font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </Link>

      {/* Image section */}
      <div className={`rounded-xl overflow-hidden mb-8 ${listing.images.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : ''}`}>
        {listing.images.length > 0 ? (
          <>
            <div className={`${listing.images.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'} bg-gray-100 relative`}>
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${listing.images[0].url}`}
                alt={p.summary_es}
                className="w-full h-full object-cover"
              />
              {listing.isPromoted && (
                <div className="absolute top-4 left-4 promoted-badge">
                  Community Supporter
                </div>
              )}
            </div>
            {listing.images.length > 1 && (
              <div className="hidden md:grid grid-rows-2 gap-2">
                {listing.images.slice(1, 3).map((img) => (
                  <div key={img.id} className="aspect-[4/3] bg-gray-100">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${img.url}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="aspect-[16/9] bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm">Sin fotos disponibles</span>
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-[26px] font-semibold text-gray-900 mb-1">
        {formatPropertyType(p.property_type)} en {p.location || 'la Costa Oaxaquena'}
      </h1>
      <p className="text-base text-gray-500 mb-1">
        {p.bedrooms !== null && <>{p.bedrooms} recamara{(p.bedrooms ?? 0) > 1 ? 's' : ''}</>}
        {p.bathrooms !== null && <> &middot; {p.bathrooms} {(p.bathrooms ?? 0) > 1 ? 'banos' : 'bano'}</>}
        {p.capacity !== null && <> &middot; {p.capacity} personas</>}
      </p>
      {p.neighborhood && (
        <p className="text-sm text-gray-500">{p.neighborhood}</p>
      )}
      <p className="text-sm text-gray-500 mt-1">
        {formatDateRange(p.dates_available)}
      </p>

      <hr className="section-divider" />

      {/* Price */}
      <div className="py-2">
        <span className="text-2xl font-semibold text-gray-900">
          {formatPrice(p.price, p.currency)}
        </span>
        <span className="text-base text-gray-500">
          {' '}/ {p.price_period === 'monthly' ? 'mes' : p.price_period === 'weekly' ? 'semana' : 'dia'}
        </span>
        {p.long_stay_discount && (
          <p className="text-sm text-gray-500 mt-1 underline">Descuento por larga estancia disponible</p>
        )}
      </div>

      <hr className="section-divider" />

      {/* Description */}
      <div className="py-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Acerca de este espacio</h2>
        <p className="text-base text-gray-600 leading-relaxed">{p.summary_es}</p>
        {p.summary_en && (
          <p className="text-sm text-gray-400 mt-3 italic">{p.summary_en}</p>
        )}
      </div>

      <hr className="section-divider" />

      {/* Beds */}
      {(p.beds?.length ?? 0) > 0 && (
        <>
          <div className="py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Donde dormiras</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {(p.beds ?? []).map((bed, i) => (
                <div key={i} className="flex-shrink-0 border border-gray-200 rounded-xl p-4 min-w-[160px]">
                  <p className="font-medium text-sm text-gray-900">{bed.room || `Espacio ${i + 1}`}</p>
                  <p className="text-sm text-gray-500 mt-1">{bed.type.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>
          <hr className="section-divider" />
        </>
      )}

      {/* Amenities */}
      <div className="py-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lo que ofrece este lugar</h2>
        {(p.amenities?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(p.amenities ?? []).map((a) => (
              <div key={a} className="flex items-center gap-3 text-base text-gray-600">
                <span>{formatAmenity(a)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No especificado</p>
        )}

        {(p.missing_amenities_common?.length ?? 0) > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">No mencionado (pregunta al propietario)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(p.missing_amenities_common ?? []).map((a) => (
                <div key={a} className="flex items-center gap-3 text-base text-gray-400 line-through">
                  <span>{formatAmenity(a)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className="section-divider" />

      {/* Quality notes */}
      {(p.quality_notes?.length ?? 0) > 0 && (
        <>
          <div className="py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Cosas que debes saber</h2>
            <ul className="space-y-2">
              {(p.quality_notes ?? []).map((note, i) => (
                <li key={i} className="text-base text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">&ndash;</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
          <hr className="section-divider" />
        </>
      )}

      {/* Community Supporter */}
      {listing.isPromoted && (
        <>
          <div className="py-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl">
              <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Community Supporter</p>
              <p className="text-sm text-gray-500">
                Este propietario apoya a la escuela Raices de Vida.
              </p>
            </div>
          </div>
          <hr className="section-divider" />
        </>
      )}

      {/* Contact CTA */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 md:-mx-10 md:static md:mx-0 md:border md:rounded-xl md:p-6 md:mt-2 md:mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xl font-semibold text-gray-900">
              {formatPrice(p.price, p.currency)}
            </span>
            <span className="text-sm text-gray-500 font-normal">
              {' '}/ {p.price_period === 'monthly' ? 'mes' : p.price_period === 'weekly' ? 'semana' : 'dia'}
            </span>
          </div>
          <WhatsAppButton contactUrl={listing.contactUrl} />
        </div>
      </div>
    </div>
  );
}
