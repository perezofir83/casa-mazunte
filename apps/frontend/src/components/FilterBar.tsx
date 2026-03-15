'use client';

import { useState, useRef, useEffect } from 'react';
import { ListingsFilters } from '@/lib/api';

interface Props {
  onFilter: (filters: ListingsFilters) => void;
  currentFilters: ListingsFilters;
}

const LOCATIONS = [
  { value: 'mazunte', label: 'Mazunte' },
  { value: 'san agustinillo', label: 'San Agustinillo' },
  { value: 'zipolite', label: 'Zipolite' },
  { value: 'puerto angel', label: 'Puerto Angel' },
  { value: 'puerto escondido', label: 'Puerto Escondido' },
  { value: 'huatulco', label: 'Huatulco' },
];

const PROPERTY_TYPES = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'cuarto', label: 'Cuarto' },
  { value: 'estudio', label: 'Estudio' },
  { value: 'cabana', label: 'Cabana' },
  { value: 'loft', label: 'Loft' },
];

const PRICE_RANGES = [
  { value: '0-5000', label: 'Hasta $5,000' },
  { value: '5000-10000', label: '$5,000 - $10,000' },
  { value: '10000-15000', label: '$10,000 - $15,000' },
  { value: '15000-25000', label: '$15,000 - $25,000' },
  { value: '25000-99999', label: 'Mas de $25,000' },
];

export default function FilterBar({ onFilter, currentFilters }: Props) {
  const [location, setLocation] = useState(currentFilters.location || '');
  const [propertyType, setPropertyType] = useState(currentFilters.propertyType || '');
  const [priceRange, setPriceRange] = useState('');
  const [bedrooms, setBedrooms] = useState(currentFilters.minBedrooms || 0);
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [showBedroomPopover, setShowBedroomPopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const priceRef = useRef<HTMLDivElement>(null);
  const bedroomRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setShowPricePopover(false);
      }
      if (bedroomRef.current && !bedroomRef.current.contains(e.target as Node)) {
        setShowBedroomPopover(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDatePopover(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const buildAndApply = (overrides: Partial<{ loc: string; type: string; price: string; beds: number; dFrom: string; dTo: string }>) => {
    const loc = overrides.loc ?? location;
    const type = overrides.type ?? propertyType;
    const price = overrides.price ?? priceRange;
    const beds = overrides.beds ?? bedrooms;
    const dFrom = overrides.dFrom !== undefined ? overrides.dFrom : dateFrom;
    const dTo = overrides.dTo !== undefined ? overrides.dTo : dateTo;

    const filters: ListingsFilters = {};
    if (loc) filters.location = loc;
    if (type) filters.propertyType = type;
    if (beds > 0) filters.minBedrooms = beds;
    if (price) {
      const [min, max] = price.split('-').map(Number);
      if (min) filters.minPrice = min;
      if (max) filters.maxPrice = max;
    }
    if (dFrom) filters.dateFrom = dFrom;
    if (dTo) filters.dateTo = dTo;
    onFilter(filters);
  };

  const toggleLocation = (val: string) => {
    const next = location === val ? '' : val;
    setLocation(next);
    buildAndApply({ loc: next });
  };

  const togglePropertyType = (val: string) => {
    const next = propertyType === val ? '' : val;
    setPropertyType(next);
    buildAndApply({ type: next });
  };

  const selectPrice = (val: string) => {
    const next = priceRange === val ? '' : val;
    setPriceRange(next);
    setShowPricePopover(false);
    buildAndApply({ price: next });
  };

  const selectBedrooms = (val: number) => {
    setBedrooms(val);
    setShowBedroomPopover(false);
    buildAndApply({ beds: val });
  };

  const applyDates = () => {
    if (dateFrom && dateTo) {
      const diff = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24);
      if (diff < 14) return; // don't apply if less than 14 days
    }
    setShowDatePopover(false);
    buildAndApply({ dFrom: dateFrom, dTo: dateTo });
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    setShowDatePopover(false);
    buildAndApply({ dFrom: '', dTo: '' });
  };

  const hasFilters = location || propertyType || priceRange || bedrooms > 0 || dateFrom;

  const clearAll = () => {
    setLocation('');
    setPropertyType('');
    setPriceRange('');
    setBedrooms(0);
    setDateFrom('');
    setDateTo('');
    onFilter({});
  };

  return (
    <div className="bg-white sticky top-[57px] z-40 border-b border-gray-200">
      <div className="max-w-[1760px] mx-auto px-6 md:px-10 lg:px-20 py-3">
        <div className="scroll-pills items-center">
          {/* Location pills */}
          {LOCATIONS.map((l) => (
            <button
              key={l.value}
              onClick={() => toggleLocation(l.value)}
              className={`filter-pill ${location === l.value ? 'active' : ''}`}
            >
              {l.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 flex-shrink-0 mx-1" />

          {/* Property type pills */}
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => togglePropertyType(t.value)}
              className={`filter-pill ${propertyType === t.value ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 flex-shrink-0 mx-1" />

          {/* Price popover */}
          <div className="relative flex-shrink-0" ref={priceRef}>
            <button
              onClick={() => { setShowPricePopover(!showPricePopover); setShowBedroomPopover(false); }}
              className={`filter-pill inline-flex items-center gap-1.5 ${priceRange ? 'active' : ''}`}
            >
              {priceRange ? PRICE_RANGES.find(r => r.value === priceRange)?.label : 'Precio'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPricePopover && (
              <div className="absolute top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg py-2 min-w-[200px] z-50">
                {PRICE_RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => selectPrice(r.value)}
                    className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${priceRange === r.value ? 'font-semibold bg-gray-50' : ''}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bedroom popover */}
          <div className="relative flex-shrink-0" ref={bedroomRef}>
            <button
              onClick={() => { setShowBedroomPopover(!showBedroomPopover); setShowPricePopover(false); }}
              className={`filter-pill inline-flex items-center gap-1.5 ${bedrooms > 0 ? 'active' : ''}`}
            >
              {bedrooms > 0 ? `${bedrooms}+ Rec.` : 'Recamaras'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBedroomPopover && (
              <div className="absolute top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg py-2 min-w-[140px] z-50">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => selectBedrooms(n)}
                    className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${bedrooms === n ? 'font-semibold bg-gray-50' : ''}`}
                  >
                    {n === 0 ? 'Cualquiera' : `${n}+`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date popover */}
          <div className="relative flex-shrink-0" ref={dateRef}>
            <button
              onClick={() => { setShowDatePopover(!showDatePopover); setShowPricePopover(false); setShowBedroomPopover(false); }}
              className={`filter-pill inline-flex items-center gap-1.5 ${dateFrom ? 'active' : ''}`}
            >
              {dateFrom
                ? `${new Date(dateFrom).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}${dateTo ? ` - ${new Date(dateTo).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : ''}`
                : 'Fechas'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDatePopover && (
              <div className="absolute top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-4 min-w-[260px] z-50">
                <p className="text-xs font-medium text-gray-500 mb-3">Disponible (mín. 14 días)</p>
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Desde</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
                {dateFrom && dateTo && (() => {
                  const diff = Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24));
                  return diff < 14 ? (
                    <p className="text-xs text-red-500 mb-2">Mínimo 14 días ({diff} días seleccionados)</p>
                  ) : (
                    <p className="text-xs text-emerald-600 mb-2">{diff} días ✓</p>
                  );
                })()}
                <div className="flex gap-2">
                  <button onClick={applyDates} className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800">
                    Aplicar
                  </button>
                  {dateFrom && (
                    <button onClick={clearDates} className="px-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-500">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear all */}
          {hasFilters && (
            <button
              onClick={clearAll}
              className="filter-pill text-gray-500 border-transparent hover:border-gray-300"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
