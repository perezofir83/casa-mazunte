'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOwnerListing,
  updateListing,
  approveListing,
  uploadMedia,
  deleteMedia,
  saveAvailability,
  isLoggedIn,
} from '@/lib/ownerApi';
import { formatPrice, formatPropertyType } from '@/lib/api';

type Tab = 'details' | 'media' | 'availability' | 'promote';

interface AvailabilityBlock {
  id?: string;
  dateFrom: string;
  dateTo: string;
}

export default function OwnerListingEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Details tab
  const [rawText, setRawText] = useState('');

  // Availability tab
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  // Media tab
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/owner'); return; }
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const data = await getOwnerListing(id);
      setListing(data);
      setRawText(data.rawText || '');
      setBlocks(
        (data.availability || []).map((b: any) => ({
          id: b.id,
          dateFrom: b.dateFrom.split('T')[0],
          dateTo: b.dateTo.split('T')[0],
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  // --- Details ---
  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await updateListing(id, { rawText });
      showFeedback('¡Guardado! El sistema actualizará los detalles en un momento.');
      loadListing();
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('¿Publicar esta propiedad para que los inquilinos la vean?')) return;
    setSaving(true);
    try {
      await approveListing(id);
      showFeedback('¡Propiedad publicada! Ya está visible en Casa Mazunte.');
      loadListing();
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  // --- Media ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    let uploadError = '';

    for (const file of files) {
      try {
        await uploadMedia(id, file);
      } catch (err: any) {
        uploadError = err.message;
        break;
      }
    }

    setUploading(false);
    if (uploadError) showFeedback(uploadError, true);
    else showFeedback('Archivo subido correctamente.');
    loadListing();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      await deleteMedia(id, mediaId);
      showFeedback('Archivo eliminado.');
      loadListing();
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  // --- Availability ---
  const addBlock = () => {
    if (!newFrom || !newTo) return;
    const from = new Date(newFrom);
    const to = new Date(newTo);
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 14) {
      showFeedback('El bloque debe tener mínimo 14 días.', true);
      return;
    }
    setBlocks([...blocks, { dateFrom: newFrom, dateTo: newTo }]);
    setNewFrom('');
    setNewTo('');
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await saveAvailability(id, blocks.map(b => ({
        dateFrom: new Date(b.dateFrom).toISOString(),
        dateTo: new Date(b.dateTo).toISOString(),
      })));
      showFeedback('¡Disponibilidad guardada!');
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-24 mb-6" />
        <div className="h-7 bg-gray-200 rounded w-1/2 mb-8" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500">Propiedad no encontrada.</p>
        <Link href="/owner/dashboard" className="text-sm underline mt-4 block">Volver</Link>
      </div>
    );
  }

  const p = listing.parsedData;
  const images = (listing.images || []).filter((i: any) => i.mediaType !== 'video');
  const video = (listing.images || []).find((i: any) => i.mediaType === 'video');
  const isActive = listing.status === 'ACTIVE';
  const TABS: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Detalles' },
    { key: 'media', label: `Fotos y video (${images.length}/10)` },
    { key: 'availability', label: 'Disponibilidad' },
    { key: 'promote', label: 'Destacar' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Back */}
      <Link
        href="/owner/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mis propiedades
      </Link>

      {/* Title + status */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">
          {p ? `${formatPropertyType(p.property_type)} en ${p.location || 'ubicación'}` : 'Editar propiedad'}
        </h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {isActive ? 'Publicado' : 'Pendiente'}
        </span>
      </div>
      {p && (
        <p className="text-sm text-gray-500 mb-5">
          {formatPrice(p.price, p.currency)} /mes
        </p>
      )}

      {/* Feedback */}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Tab: Details ---- */}
      {tab === 'details' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción completa
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Escribe todos los detalles: precio, habitaciones, baños, amenidades, fechas de disponibilidad.
              El sistema procesará el texto automáticamente.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              placeholder="Se renta casa en Mazunte, 2 recamaras, 1 baño, cocina equipada, WiFi, disponible del 1 de abril al 30 de noviembre. Precio $10,000 MXN/mes. Descuento para estancias largas..."
            />
          </div>

          {/* Parsed preview */}
          {p && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Vista previa (procesado automáticamente)</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Precio:</span> {formatPrice(p.price, p.currency)}/mes</div>
                <div><span className="text-gray-400">Tipo:</span> {formatPropertyType(p.property_type)}</div>
                <div><span className="text-gray-400">Recámaras:</span> {p.bedrooms ?? '—'}</div>
                <div><span className="text-gray-400">Baños:</span> {p.bathrooms ?? '—'}</div>
                <div><span className="text-gray-400">Capacidad:</span> {p.capacity ?? '—'} personas</div>
                <div><span className="text-gray-400">Descuento larga:</span> {p.long_stay_discount ? 'Sí' : 'No'}</div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSaveDetails}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {!listing.ownerApproved && (
              <button
                onClick={handleApprove}
                disabled={saving}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-lg font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                Publicar propiedad ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- Tab: Media ---- */}
      {tab === 'media' && (
        <div className="space-y-5">
          {/* Upload button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              {uploading ? 'Subiendo...' : 'Agregar fotos o video'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP hasta 5MB · MP4 hasta 100MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Images grid */}
          {images.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Fotos ({images.length}/10)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img: any) => (
                  <div key={img.id} className="relative aspect-square group">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${img.url}`}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleDeleteMedia(img.id)}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Video (1 máximo)
            </p>
            {video ? (
              <div className="relative">
                <video
                  src={`${process.env.NEXT_PUBLIC_API_URL}${video.url}`}
                  controls
                  className="w-full rounded-xl"
                />
                <button
                  onClick={() => handleDeleteMedia(video.id)}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Eliminar video
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin video. Sube un MP4 de hasta 100MB.</p>
            )}
          </div>
        </div>
      )}

      {/* ---- Tab: Availability ---- */}
      {tab === 'availability' && (
        <div className="space-y-5">
          <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-lg">
            <strong>Mínimo 14 días</strong> por bloque. Los inquilinos podrán filtrar por fechas disponibles.
          </div>

          {/* Add block */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Agregar período disponible</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  min={newFrom || new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                />
              </div>
            </div>
            <button
              onClick={addBlock}
              disabled={!newFrom || !newTo}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Agregar período
            </button>
          </div>

          {/* Blocks list */}
          {blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map((b, i) => {
                const from = new Date(b.dateFrom);
                const to = new Date(b.dateTo);
                const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {from.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' → '}
                        {to.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">{days} días</p>
                    </div>
                    <button
                      onClick={() => removeBlock(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin períodos de disponibilidad configurados.
            </p>
          )}

          <button
            onClick={handleSaveAvailability}
            disabled={saving}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar disponibilidad'}
          </button>
        </div>
      )}

      {/* ---- Tab: Promote ---- */}
      {tab === 'promote' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Destaca tu propiedad</h3>
                <p className="text-sm text-amber-700">Aparece primero en los resultados por 30 días</p>
              </div>
            </div>
            <p className="text-sm text-amber-800">
              Dona <strong>$250 MXN</strong> a la escuela comunitaria{' '}
              <strong>Raíces de Vida</strong> en Mazunte y sube un comprobante. Tu propiedad
              aparecerá al inicio de la página con la insignia "Community Supporter".
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">¿Cómo donar?</p>
            <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Transfiere $250 MXN a la escuela Raíces de Vida</li>
              <li>Guarda el comprobante de transferencia</li>
              <li>Envíalo a Ofir por WhatsApp</li>
              <li>Ofir activará tu destacado en 24 horas</li>
            </ol>
          </div>

          {listing.promotion?.isPromoted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <p className="text-sm text-emerald-800 font-medium">✓ Tu propiedad está destacada</p>
              {listing.promotion.expiresAt && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Válido hasta: {new Date(listing.promotion.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Para más información, contacta a Ofir por WhatsApp.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
