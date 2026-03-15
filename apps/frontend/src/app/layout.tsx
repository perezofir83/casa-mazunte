import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casa Mazunte | Rentas en la Costa Oaxaqueña',
  description:
    'Encuentra tu próximo hogar en Mazunte, San Agustinillo, Zipolite y la costa de Oaxaca. Rentas a mediano y largo plazo, sin comisiones.',
  keywords: [
    'rentas mazunte',
    'renta departamento oaxaca',
    'san agustinillo renta',
    'zipolite renta',
    'long term rental oaxaca',
    'mazunte apartment',
  ],
  openGraph: {
    title: 'Casa Mazunte | Rentas en la Costa Oaxaqueña',
    description: 'Encuentra tu próximo hogar en la costa de Oaxaca.',
    type: 'website',
    locale: 'es_MX',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        {/* Header */}
        <header className="bg-emerald-800 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Casa Mazunte</h1>
                <p className="text-xs text-emerald-200">Rentas en la Costa Oaxaqueña</p>
              </div>
            </a>
            <div className="hidden sm:flex items-center gap-4 text-sm text-emerald-100">
              <span>100% Gratis</span>
              <span className="text-emerald-400">•</span>
              <span>Sin comisiones</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-emerald-900 text-emerald-100 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div>
                <h3 className="font-bold text-white mb-2">🏠 Casa Mazunte</h3>
                <p className="text-sm text-emerald-300 max-w-md">
                  Plataforma comunitaria de rentas a mediano y largo plazo en la costa oaxaqueña.
                  100% gratuita para inquilinos y propietarios.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">⭐ Apoya a la comunidad</h4>
                <p className="text-sm text-emerald-300 max-w-sm">
                  Promueve tu propiedad donando $250 MXN a la escuela
                  <strong> Raíces de Vida</strong>. Tu anuncio aparece al inicio por 30 días.
                </p>
              </div>
            </div>
            <div className="border-t border-emerald-700 mt-6 pt-4 text-xs text-emerald-400 text-center">
              Casa Mazunte — Un proyecto para la comunidad 🌴
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
