'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchListings, Listing, ListingsFilters } from '@/lib/api';
import ListingCard from '@/components/ListingCard';
import FilterBar from '@/components/FilterBar';

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListingsFilters>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadListings = useCallback(async (currentFilters: ListingsFilters, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetchListings({
        ...currentFilters,
        limit: 12,
        cursor: append ? cursor || undefined : undefined,
      });

      if (append) {
        setListings((prev) => [...prev, ...response.data]);
      } else {
        setListings(response.data);
      }

      setCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError('No se pudieron cargar las propiedades. Verifica que el servidor esté activo.');
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  // Initial load
  useEffect(() => {
    loadListings({});
  }, []);

  // Handle filter changes
  const handleFilter = (newFilters: ListingsFilters) => {
    setFilters(newFilters);
    setCursor(null);
    loadListings(newFilters);
  };

  // Load more
  const handleLoadMore = () => {
    loadListings(filters, true);
  };

  return (
    <div>
      {/* Filter bar */}
      <FilterBar onFilter={handleFilter} currentFilters={filters} />

      {/* Hero section */}
      <div className="bg-gradient-to-b from-emerald-50 to-amber-50/30 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Encuentra tu hogar en la costa 🌴
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Rentas verificadas a mediano y largo plazo en Mazunte, San Agustinillo, Zipolite y más.
            Contacta directo al propietario por WhatsApp.
          </p>
        </div>
      </div>

      {/* Listings grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-16">
            <div className="text-5xl mb-4">😵</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Error al cargar propiedades
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => loadListings(filters)}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700"
            >
              Reintentar
            </button>
          </div>
        ) : listings.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron propiedades
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta cambiar los filtros o revisa más tarde.
            </p>
            <button
              onClick={() => handleFilter({})}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <p className="text-sm text-gray-500 mb-4">
              {listings.length} propiedad{listings.length !== 1 ? 'es' : ''} encontrada{listings.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-white border-2 border-emerald-600 text-emerald-700 px-8 py-3 rounded-xl font-medium hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? '⏳ Cargando...' : 'Ver más propiedades'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
