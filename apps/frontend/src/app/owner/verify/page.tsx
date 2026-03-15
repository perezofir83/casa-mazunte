'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOTP, requestOTP } from '@/lib/ownerApi';

export default function OwnerVerifyPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const savedPhone = sessionStorage.getItem('otp_phone');
    if (!savedPhone) {
      router.replace('/owner');
      return;
    }
    setPhone(savedPhone);
    inputRefs.current[0]?.focus();

    // Countdown for resend
    const interval = setInterval(() => {
      setResendCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (digit && index === 5 && next.every((d) => d)) {
      submitCode(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      await verifyOTP(phone, code);
      sessionStorage.removeItem('otp_phone');
      router.replace('/owner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Código incorrecto');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      await requestOTP(phone);
      setResendCountdown(60);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) submitCode(code);
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

        <div className="border border-gray-200 rounded-2xl p-8">
          <button
            onClick={() => router.replace('/owner')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cambiar número
          </button>

          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Código de verificación
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Enviamos un código de 6 dígitos a{' '}
            <span className="font-medium text-gray-700">{phone}</span>
          </p>

          <form onSubmit={handleSubmit}>
            {/* OTP boxes */}
            <div className="flex gap-2 mb-4" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="flex-1 aspect-square text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || digits.some((d) => !d)}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-base hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-400">
                Reenviar código en {resendCountdown}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-sm text-gray-600 underline hover:text-gray-900"
              >
                Reenviar código
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
