import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casa Mazunte | Rentas en la Costa Oaxaquena',
  description:
    'Encuentra tu proximo hogar en Mazunte, San Agustinillo, Zipolite y la costa de Oaxaca. Rentas a mediano y largo plazo, sin comisiones.',
  keywords: [
    'rentas mazunte',
    'renta departamento oaxaca',
    'san agustinillo renta',
    'zipolite renta',
    'long term rental oaxaca',
    'mazunte apartment',
  ],
  openGraph: {
    title: 'Casa Mazunte | Rentas en la Costa Oaxaquena',
    description: 'Encuentra tu proximo hogar en la costa de Oaxaca.',
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
        <header className="bg-white sticky top-0 z-50 border-b border-gray-200">
          <div className="max-w-[1760px] mx-auto px-6 md:px-10 lg:px-20 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold text-xl tracking-tight">Casa Mazunte</span>
            </a>
            <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500 font-medium">
              <span>100% Gratis</span>
              <span className="text-gray-300">|</span>
              <span>Sin comisiones</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-gray-50 text-gray-600 mt-12 border-t border-gray-200">
          <div className="max-w-[1760px] mx-auto px-6 md:px-10 lg:px-20 py-8">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Casa Mazunte</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Plataforma comunitaria de rentas a mediano y largo plazo en la costa oaxaquena.
                  100% gratuita para inquilinos y propietarios.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Apoya a la comunidad</h4>
                <p className="text-sm text-gray-500 max-w-sm">
                  Promueve tu propiedad donando $250 MXN a la escuela
                  <strong> Raices de Vida</strong>. Tu anuncio aparece al inicio por 30 dias.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 mt-6 pt-4 text-xs text-gray-400 text-center">
              Casa Mazunte — Un proyecto para la comunidad
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
