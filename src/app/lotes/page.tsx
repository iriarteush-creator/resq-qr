'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LotesQrPage() {
  const [prefix, setPrefix] = useState('USH');
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(12);
  const baseUrl = 'https://resq-qr.vercel.app/q/';

  const codes = Array.from({ length: Math.min(50, Math.max(1, count)) }, (_, idx) => {
    const num = startNum + idx;
    return `${prefix.toUpperCase()}-${String(num).padStart(4, '0')}`;
  });

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-[#ff5500] uppercase">
              PRODUCCIÓN BAMBU LAB A1 COMBO • USHUAIA
            </p>
            <h1 className="text-3xl font-black text-white">
              ResQ · Panel de Códigos QR para Llavero
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Escanea cualquiera de estos QR con la cámara de tu celular para probar el flujo real online.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
          >
            ← Volver al Portal
          </Link>
        </header>

        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Prefijo del Lote
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono uppercase text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Desde el número
            </label>
            <input
              type="number"
              min={1}
              value={startNum}
              onChange={(e) => setStartNum( parseInt(e.target.value || '1', 10))}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Cantidad a mostrar
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || '12', 10))}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {codes.map((code) => {
            const targetUrl = `${baseUrl}${code}`;
            const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&margin=1&format=svg&data=${encodeURIComponent(
              targetUrl
            )}`;
            return (
              <div
                key={code}
                className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 text-center space-y-2.5 flex flex-col items-center"
              >
                <div className="bg-white p-2.5 rounded-xl">
                  <img src={qrImg} alt={code} className="w-36 h-36" loading="lazy" />
                </div>
                <p className="font-mono text-sm font-black text-white">{code}</p>
                <p className="text-[10px] text-slate-400 break-all">{targetUrl}</p>
                <div className="flex gap-2 w-full pt-1">
                  <Link
                    href={`/q/${code}`}
                    className="flex-1 py-1.5 rounded-lg bg-[#ff5500] hover:bg-orange-600 text-[11px] font-bold text-white"
                  >
                    Abrir
                  </Link>
                  <a
                    href={qrImg}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700"
                  >
                    SVG 3D
                  </a>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
