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
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-64 bg-gray-200 rounded-2xl mb-6" />
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
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
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">😔</div>
        <h2 className="text-xl font-semibold mb-2">Propiedad no encontrada</h2>
        <p className="text-gray-500 mb-6">{error || 'Esta propiedad ya no está disponible.'}</p>
        <Link
          href="/"
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700"
        >
          ← Volver a todas las propiedades
        </Link>
      </div>
    );
  }

  const p = listing.parsedData;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Volver a propiedades
      </Link>

      {/* Image gallery */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-amber-50 h-64 md:h-80 flex items-center justify-center mb-6">
        {listing.images.length > 0 ? (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${listing.images[0].url}`}
            alt={p.summary_es}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <span className="text-6xl block mb-2">🏠</span>
            <span className="text-gray-500">Sin fotos disponibles</span>
          </div>
        )}

        {/* Promoted badge */}
        {listing.isPromoted && (
          <div className="absolute top-4 left-4 promoted-badge text-sm">
            ⭐ Community Supporter
          </div>
        )}
      </div>

      {/* Title & Price */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-medium">
              {formatPropertyType(p.property_type)}
            </span>
            {p.long_stay_discount && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-medium">
                💰 Descuento larga estancia
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            📍 {p.location || 'Ubicación no especificada'}
          </h2>
          {p.neighborhood && (
            <p className="text-sm text-gray-500">Zona: {p.neighborhood}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-800">
            {formatPrice(p.price, p.currency)}
          </div>
          <div className="text-sm text-gray-500">
            por {p.price_period === 'monthly' ? 'mes' : p.price_period === 'weekly' ? 'semana' : 'día'}
          </div>
        </div>
      </div>

      {/* Key details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
          <div className="text-2xl mb-1">🛏️</div>
          <div className="font-bold text-lg">{p.bedrooms ?? '?'}</div>
          <div className="text-xs text-gray-500">Recámara{(p.bedrooms ?? 0) > 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
          <div className="text-2xl mb-1">🚿</div>
          <div className="font-bold text-lg">{p.bathrooms ?? '?'}</div>
          <div className="text-xs text-gray-500">Baño{(p.bathrooms ?? 0) > 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
          <div className="text-2xl mb-1">👥</div>
          <div className="font-bold text-lg">{p.capacity ?? '?'}</div>
          <div className="text-xs text-gray-500">Personas</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-sm font-medium">{formatDateRange(p.dates_available)}</div>
        </div>
      </div>

      {/* Beds detail */}
      {p.beds.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">🛏️ Camas</h3>
          <div className="flex flex-wrap gap-2">
            {p.beds.map((bed, i) => (
              <span key={i} className="amenity-tag">
                {bed.type.replace(/_/g, ' ')} {bed.room ? `(${bed.room})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">📝 Descripción</h3>
        <p className="text-gray-600 mb-3">{p.summary_es}</p>
        <p className="text-gray-500 text-sm italic">{p.summary_en}</p>
      </div>

      {/* Amenities */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">✅ Incluye</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {p.amenities.map((a) => (
            <span key={a} className="amenity-tag">
              {formatAmenity(a)}
            </span>
          ))}
          {p.amenities.length === 0 && (
            <span className="text-sm text-gray-400">No especificado</span>
          )}
        </div>

        {p.missing_amenities_common.length > 0 && (
          <>
            <h4 className="font-medium text-gray-600 mb-2 text-sm">⚠️ No mencionado (pregunta al propietario)</h4>
            <div className="flex flex-wrap gap-2">
              {p.missing_amenities_common.map((a) => (
                <span key={a} className="missing-tag">
                  {formatAmenity(a)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quality notes */}
      {p.quality_notes.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">💡 Notas importantes</h3>
          <ul className="space-y-1">
            {p.quality_notes.map((note, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Community Supporter info */}
      {listing.isPromoted && (
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl p-4 border border-amber-200 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="promoted-badge">⭐ Community Supporter</span>
          </div>
          <p className="text-sm text-gray-600">
            Este propietario apoya a la comunidad. Donó a la escuela <strong>Raíces de Vida</strong> para
            promover su anuncio.
          </p>
        </div>
      )}

      {/* Contact CTA - Fixed at bottom on mobile */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md rounded-t-2xl p-4 -mx-4 border-t shadow-lg md:static md:bg-transparent md:rounded-xl md:mx-0 md:border md:shadow-sm md:p-6 md:mb-6">
        <div className="flex flex-col md:flex-row items-center gap-3 md:justify-between">
          <div className="text-center md:text-left">
            <p className="font-semibold text-gray-700">¿Te interesa esta propiedad?</p>
            <p className="text-sm text-gray-500">Contacta directo al propietario por WhatsApp</p>
          </div>
          <WhatsAppButton contactUrl={listing.contactUrl} />
        </div>
      </div>
    </div>
  );
}
