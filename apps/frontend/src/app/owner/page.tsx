'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestOTP } from '@/lib/ownerApi';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestOTP(phone);
      // Pass phone via sessionStorage so verify page can use it
      sessionStorage.setItem('otp_phone', phone);
      router.push('/owner/verify');
    } catch (err: any) {
      setError(err.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-emerald-700 font-bold text-2xl tracking-tight">
            Casa Mazunte
          </a>
          <p className="text-gray-500 text-sm mt-2">Portal de propietarios</p>
        </div>

        {/* Card */}
        <div className="border border-gray-200 rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Entra a tu cuenta
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Recibirás un código de verificación por WhatsApp.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 951 123 4567"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-base hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar código por WhatsApp'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Eres inquilino?{' '}
          <a href="/" className="underline hover:text-gray-600">
            Ver propiedades
          </a>
        </p>
      </div>
    </div>
  );
}
