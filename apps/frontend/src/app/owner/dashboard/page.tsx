'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOwnerListings, clearToken, isLoggedIn } from '@/lib/ownerApi';
import { formatPrice, formatPropertyType, formatDateRange } from '@/lib/api';

export default function OwnerDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/owner');
      return;
    }
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const data = await getOwnerListings();
      setListings(data);
    } catch (err: any) {
      if (err.message?.includes('token')) {
        clearToken();
        router.replace('/owner');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/owner');
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    PENDING_REVIEW: { label: 'Pendiente de revisión', color: 'bg-amber-100 text-amber-800' },
    ACTIVE: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-800' },
    EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-600' },
    ARCHIVED: { label: 'Archivado', color: 'bg-gray-100 text-gray-600' },
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-8" />
        {[1, 2].map((i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-5 mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mis propiedades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tus anuncios en Casa Mazunte</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
        >
          Cerrar sesión
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-16 border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">No tienes propiedades registradas aún.</p>
          <p className="text-gray-400 text-xs mt-1">
            Cuando Ofir vincule una propiedad a tu cuenta, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const p = listing.parsedData;
            const status = statusLabel[listing.status] || { label: listing.status, color: 'bg-gray-100 text-gray-600' };

            return (
              <Link key={listing.id} href={`/owner/listing/${listing.id}`}>
                <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900 truncate">
                          {p ? `${formatPropertyType(p.property_type)} en ${p.location || 'ubicación'}` : 'Propiedad'}
                        </h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      {p && (
                        <p className="text-sm text-gray-500">
                          {formatPrice(p.price, p.currency)} /mes
                          {p.bedrooms !== null && <> &middot; {p.bedrooms} rec.</>}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {listing.images?.length || 0} foto{listing.images?.length !== 1 ? 's' : ''}
                        {' · '}
                        {listing.availability?.length > 0
                          ? `${listing.availability.length} bloque${listing.availability.length > 1 ? 's' : ''} de disponibilidad`
                          : 'Sin fechas configuradas'}
                      </p>
                    </div>

                    {/* Thumbnail */}
                    {listing.images?.find((i: any) => i.mediaType === 'image') ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${listing.images.find((i: any) => i.mediaType === 'image').url}`}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Pending approval banner */}
                  {!listing.ownerApproved && listing.status !== 'ARCHIVED' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                      <span className="text-amber-500">⚠</span>
                      <p className="text-xs text-amber-700 font-medium">
                        Debes aprobar esta propiedad para publicarla
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
