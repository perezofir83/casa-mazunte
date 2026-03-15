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
      setError('No se pudieron cargar las propiedades. Verifica que el servidor este activo.');
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

      {/* Listings */}
      <div className="max-w-[1760px] mx-auto px-6 md:px-10 lg:px-20 pt-6 pb-8">
        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[20/19] bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Error al cargar propiedades
            </h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => loadListings(filters)}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : listings.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No se encontraron propiedades
            </h3>
            <p className="text-gray-500 mb-6">
              Intenta cambiar los filtros o revisa mas tarde.
            </p>
            <button
              onClick={() => handleFilter({})}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <p className="text-sm font-semibold text-gray-800 mb-6">
              {listings.length} propiedad{listings.length !== 1 ? 'es' : ''} encontrada{listings.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-white border border-gray-900 text-gray-900 px-8 py-3 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? 'Cargando...' : 'Ver mas propiedades'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
