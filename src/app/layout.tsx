import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResQ · Dispositivo Táctico de Seguridad & Ficha Médica Digital | Ushuaia, Patagonia',
  description:
    'EXPEDITION SAFETY & MEDICAL SOS SYSTEM · USHUAIA, PATAGONIA. Escaneá. Asistí. Rescatá. Ficha médica y de emergencia para motoristas.',
};

export const viewport: Viewport = {
  themeColor: '#0b0f17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0b0f17] text-slate-100 selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
