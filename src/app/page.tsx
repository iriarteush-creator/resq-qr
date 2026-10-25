'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [inputCode, setInputCode] = useState('USH-0001');

  const handleOpenCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    router.push(`/q/${encodeURIComponent(inputCode.trim().toUpperCase())}`);
  };

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-between p-6">
      <div className="max-w-2xl mx-auto w-full pt-8 space-y-8">
        {/* Identidad Visual Oficial ResQ */}
        <header className="text-center space-y-2 border-b border-slate-800 pb-8">
          <p className="text-xs sm:text-sm font-extrabold tracking-widest text-[#ff5500] uppercase">
            EXPEDITION SAFETY &amp; MEDICAL SOS SYSTEM • USHUAIA, PATAGONIA
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white">ResQ</h1>
          <p className="text-sm sm:text-base font-semibold tracking-wider text-slate-300 uppercase">
            DISPOSITIVO TÁCTICO DE SEGURIDAD &amp; FICHA MÉDICA DIGITAL
          </p>
          <p className="text-lg sm:text-xl font-black italic text-red-500 pt-1">
            « Escaneá. Asistí. Rescatá. »
          </p>
        </header>

        {/* Simulador / Acceso Directo por Código de Llavero */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-orange-400">
            🔍 Consultar o Activar un Llavero QR ResQ
          </h2>
          <form onSubmit={handleOpenCode} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Ej: USH-0001"
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-base font-mono font-bold uppercase text-white"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wider transition"
            >
              Abrir Ficha QR
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              href="/q/USH-0001"
              className="block p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/40 transition"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                ● Demo QR Activo (Vista Socorrista)
              </span>
              <p className="text-base font-black text-white mt-0.5">/q/USH-0001</p>
              <p className="text-xs text-slate-400 mt-1">
                Martín Gómez · Honda Africa Twin · O- · Alergia a Penicilina
              </p>
            </Link>

            <Link
              href="/q/USH-0002"
              className="block p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-orange-500/40 transition"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">
                ★ Demo QR Virgen (Nuevo en Blíster)
              </span>
              <p className="text-base font-black text-white mt-0.5">/q/USH-0002</p>
              <p className="text-xs text-slate-400 mt-1">
                Prueba el flujo de 1º escaneo: activación libre, creación de cuenta y carga de datos.
              </p>
            </Link>
          </div>
        </section>
      </div>

      <footer className="text-center text-xs text-slate-500 pt-10">
        ResQ · Diseñado en Ushuaia, Tierra del Fuego · Optimizado para baja señal 3G/Edge en rutas patagónicas.
      </footer>
    </main>
  );
}
