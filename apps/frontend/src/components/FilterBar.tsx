'use client';

import { useState } from 'react';
import { ListingsFilters } from '@/lib/api';

interface Props {
  onFilter: (filters: ListingsFilters) => void;
  currentFilters: ListingsFilters;
}

const LOCATIONS = [
  { value: '', label: 'Todas las zonas' },
  { value: 'mazunte', label: '📍 Mazunte' },
  { value: 'san agustinillo', label: '📍 San Agustinillo' },
  { value: 'zipolite', label: '📍 Zipolite' },
  { value: 'puerto angel', label: '📍 Puerto Angel' },
  { value: 'puerto escondido', label: '📍 Puerto Escondido' },
  { value: 'huatulco', label: '📍 Huatulco' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'cuarto', label: 'Cuarto' },
  { value: 'estudio', label: 'Estudio' },
  { value: 'cabana', label: 'Cabaña' },
  { value: 'loft', label: 'Loft' },
];

const PRICE_RANGES = [
  { value: '', label: 'Cualquier precio' },
  { value: '0-5000', label: 'Hasta $5,000' },
  { value: '5000-10000', label: '$5,000 - $10,000' },
  { value: '10000-15000', label: '$10,000 - $15,000' },
  { value: '15000-25000', label: '$15,000 - $25,000' },
  { value: '25000-99999', label: 'Más de $25,000' },
];

export default function FilterBar({ onFilter, currentFilters }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState(currentFilters.location || '');
  const [propertyType, setPropertyType] = useState(currentFilters.propertyType || '');
  const [priceRange, setPriceRange] = useState('');
  const [bedrooms, setBedrooms] = useState(currentFilters.minBedrooms || 0);

  const applyFilters = () => {
    const filters: ListingsFilters = {};
    if (location) filters.location = location;
    if (propertyType) filters.propertyType = propertyType;
    if (bedrooms > 0) filters.minBedrooms = bedrooms;
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      if (min) filters.minPrice = min;
      if (max) filters.maxPrice = max;
    }
    onFilter(filters);
  };

  const clearFilters = () => {
    setLocation('');
    setPropertyType('');
    setPriceRange('');
    setBedrooms(0);
    onFilter({});
  };

  const hasFilters = location || propertyType || priceRange || bedrooms > 0;

  return (
    <div className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Mobile: Toggle button */}
        <div className="flex items-center justify-between md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-xl"
          >
            🔍 Filtros
            {hasFilters && (
              <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className={`${isOpen ? 'block' : 'hidden'} md:block mt-3 md:mt-0`}>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            {/* Location */}
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Zona</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Precio / mes</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
              >
                {PRICE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Bedrooms */}
            <div className="w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Recámaras</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <button
                  onClick={() => setBedrooms(Math.max(0, bedrooms - 1))}
                  className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-300"
                >
                  -
                </button>
                <span className="text-sm font-medium w-6 text-center">
                  {bedrooms || 'Any'}
                </span>
                <button
                  onClick={() => setBedrooms(Math.min(5, bedrooms + 1))}
                  className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            {/* Apply button */}
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Buscar
              </button>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="hidden md:block text-sm text-gray-500 hover:text-red-500 px-3 py-2.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
