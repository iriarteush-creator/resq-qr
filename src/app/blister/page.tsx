'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function BlisterGeneratorPage() {
  const [edition, setEdition] = useState<'moto' | 'explorer'>('moto');
  const [code1, setCode1] = useState('USH-0001');
  const [code2, setCode2] = useState('USH-0002');

  const isExp = edition === 'explorer';

  const renderFrontCard = (serialCode: string) => (
    <div
      className="relative flex flex-col justify-between overflow-hidden bg-[#18191A] text-[#F2F4F7]"
      style={{
        width: '92mm',
        height: '138mm',
        borderRadius: '5mm',
        border: '0.35mm dashed #64748b',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Fondo técnico radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 52%, rgba(255,85,0,0.16), transparent 64%)',
        }}
      />

      {/* Bloque superior: Eurohole + Banda Naranja + Logo */}
      <div className="relative z-10">
        <div
          className="mx-auto flex items-center justify-center bg-white text-slate-400 font-bold uppercase tracking-widest"
          style={{
            width: '30mm',
            height: '7.5mm',
            marginTop: '3.5mm',
            borderRadius: '4mm',
            border: '0.35mm dashed #94a3b8',
            fontSize: '5.5pt',
          }}
        >
          Troquel Colgador
        </div>

        <div
          className="bg-[#FF5500] text-white text-center font-black uppercase"
          style={{
            marginTop: '2.2mm',
            padding: '1.2mm 2mm',
            fontSize: '5.7pt',
            letterSpacing: '0.14em',
          }}
        >
          EXPEDITION SAFETY &amp; MEDICAL SOS SYSTEM
        </div>

        <div className="text-center" style={{ padding: '2.5mm 4mm 1mm 4mm' }}>
          <div className="flex items-center justify-center" style={{ gap: '2.5mm' }}>
            {/* Cruz Roja Médica */}
            <div
              className="relative inline-flex items-center justify-center bg-[#E60000]"
              style={{
                width: '7.5mm',
                height: '7.5mm',
                borderRadius: '1.5mm',
              }}
            >
              <div
                className="absolute bg-white"
                style={{ width: '4.8mm', height: '1.8mm', borderRadius: '0.3mm' }}
              />
              <div
                className="absolute bg-white"
                style={{ width: '1.8mm', height: '4.8mm', borderRadius: '0.3mm' }}
              />
            </div>

            <span
              className="font-black text-white leading-none"
              style={{ fontSize: '24pt', letterSpacing: '-0.03em' }}
            >
              Res<span className="text-[#FF5500]">Q</span>
            </span>
          </div>

          <div
            className="inline-block font-black uppercase text-[#ff7a33]"
            style={{
              marginTop: '1.2mm',
              background: 'rgba(255,85,0,0.15)',
              border: '0.35mm solid #FF5500',
              fontSize: '6.3pt',
              letterSpacing: '0.13em',
              padding: '0.7mm 2.8mm',
              borderRadius: '2mm',
            }}
          >
            {isExp ? 'EXPLORER • HORIZONTAL BUMPER' : 'MOTO EDITION • CIRCULAR TOKEN'}
          </div>

          <p
            className="font-extrabold uppercase text-[#F2F4F7]"
            style={{ fontSize: '7pt', marginTop: '1.2mm', letterSpacing: '0.06em' }}
          >
            TAG SOS / FICHA MÉDICA DIGITAL
          </p>
        </div>
      </div>

      {/* Zona central escala 1:1 para montar el llavero físico */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div
          className="flex items-center justify-center uppercase text-slate-400 font-bold"
          style={{
            width: '15mm',
            height: '3.2mm',
            border: '0.35mm dashed #94a3b8',
            borderRadius: '1.5mm',
            fontSize: '4.6pt',
            marginBottom: '1.5mm',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          Pasar Argolla / Precinto
        </div>

        {!isExp ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              width: '54mm',
              height: '54mm',
              borderRadius: '50%',
              border: '0.6mm dashed #FF5500',
              background:
                'radial-gradient(circle, rgba(255,85,0,0.12) 0%, rgba(14,16,18,0.92) 75%)',
              padding: '4mm',
            }}
          >
            <span
              className="font-black uppercase text-[#ff7a33]"
              style={{ fontSize: '6pt', letterSpacing: '0.06em' }}
            >
              ZONA DE MONTAJE 1:1
            </span>
            <span className="text-slate-400" style={{ fontSize: '5.2pt', marginTop: '1mm' }}>
              Token Circular Ø 50–54 mm
            </span>
            <span
              className="font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-slate-700"
              style={{ fontSize: '6pt', marginTop: '2mm' }}
            >
              ID: {serialCode}
            </span>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              width: '64mm',
              height: '40mm',
              borderRadius: '5mm',
              border: '0.6mm dashed #FF5500',
              background:
                'radial-gradient(circle, rgba(255,85,0,0.12) 0%, rgba(14,16,18,0.92) 75%)',
              padding: '4mm',
            }}
          >
            <span
              className="font-black uppercase text-[#ff7a33]"
              style={{ fontSize: '6pt', letterSpacing: '0.06em' }}
            >
              ZONA DE MONTAJE 1:1
            </span>
            <span className="text-slate-400" style={{ fontSize: '5.2pt', marginTop: '1mm' }}>
              Explorer Bumper 64×40 mm
            </span>
            <span
              className="font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-slate-700"
              style={{ fontSize: '6pt', marginTop: '1.5mm' }}
            >
              ID: {serialCode}
            </span>
          </div>
        )}
      </div>

      {/* Beneficios rápidos + Pie con Eslogan Oficial */}
      <div className="relative z-10">
        <div
          className="grid grid-cols-3"
          style={{ gap: '1.5mm', padding: '0 3.5mm', marginBottom: '2mm' }}
        >
          <div
            className="text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.25mm solid rgba(255,255,255,0.12)',
              borderRadius: '2mm',
              padding: '1.4mm 1mm',
            }}
          >
            <div className="font-black uppercase text-[#FF5500]" style={{ fontSize: '5.6pt' }}>
              {isExp ? 'BUMPER TPU' : 'ZERO-SCRATCH'}
            </div>
            <div className="text-slate-300" style={{ fontSize: '4.9pt', lineHeight: 1.15 }}>
              {isExp ? 'Chasis anti-impacto' : 'Flexible · No raya tu moto'}
            </div>
          </div>

          <div
            className="text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.25mm solid rgba(255,255,255,0.12)',
              borderRadius: '2mm',
              padding: '1.4mm 1mm',
            }}
          >
            <div className="font-black uppercase text-[#FF5500]" style={{ fontSize: '5.6pt' }}>
              ACCESO &lt; 1 SEG
            </div>
            <div className="text-slate-300" style={{ fontSize: '4.9pt', lineHeight: 1.15 }}>
              Sin apps ni claves previas
            </div>
          </div>

          <div
            className="text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.25mm solid rgba(255,255,255,0.12)',
              borderRadius: '2mm',
              padding: '1.4mm 1mm',
            }}
          >
            <div className="font-black uppercase text-[#FF5500]" style={{ fontSize: '5.6pt' }}>
              GPS + SOS
            </div>
            <div className="text-slate-300" style={{ fontSize: '4.9pt', lineHeight: 1.15 }}>
              Alerta WhatsApp y Llamada 1-Touch
            </div>
          </div>
        </div>

        <div
          className="bg-[#0E1012] text-center"
          style={{
            borderTop: '0.5mm solid #FF5500',
            padding: '2.2mm 3mm 2.8mm 3mm',
          }}
        >
          <div className="font-black text-white" style={{ fontSize: '8.8pt' }}>
            « Escaneá. <span className="text-[#FF5500]">Asistí.</span> Rescatá. »
          </div>
          <div
            className="font-bold uppercase text-slate-400"
            style={{ fontSize: '5.1pt', letterSpacing: '0.12em', marginTop: '0.7mm' }}
          >
            DISEÑADO Y FABRICADO EN USHUAIA • TIERRA DEL FUEGO
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackCard = (serialCode: string) => (
    <div
      className="relative flex flex-col justify-between overflow-hidden bg-[#18191A] text-[#F2F4F7]"
      style={{
        width: '92mm',
        height: '138mm',
        borderRadius: '5mm',
        border: '0.35mm dashed #64748b',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div>
        <div
          className="mx-auto flex items-center justify-center bg-white text-slate-400 font-bold uppercase tracking-widest"
          style={{
            width: '30mm',
            height: '7.5mm',
            marginTop: '3.5mm',
            borderRadius: '4mm',
            border: '0.35mm dashed #94a3b8',
            fontSize: '5.5pt',
          }}
        >
          Dorso · Troquel Colgador
        </div>

        <div
          className="bg-[#FF5500] text-white text-center font-black uppercase"
          style={{
            marginTop: '2.2mm',
            padding: '1.2mm 2mm',
            fontSize: '5.7pt',
            letterSpacing: '0.14em',
          }}
        >
          INSTRUCCIONES DE ACTIVACIÓN Y USO EN RUTA
        </div>
      </div>

      <div
        className="flex flex-1 flex-col justify-between"
        style={{ padding: '2.5mm 4.5mm' }}
      >
        <div>
          <div
            className="font-black uppercase text-[#FF5500]"
            style={{
              fontSize: '6.8pt',
              letterSpacing: '0.07em',
              borderBottom: '0.3mm solid rgba(255,85,0,0.35)',
              paddingBottom: '1mm',
              marginBottom: '2mm',
            }}
          >
            ⚡ ACTIVÁ TU LLAVERO EN 60 SEGUNDOS
          </div>

          <div className="flex flex-col" style={{ gap: '1.8mm' }}>
            {[
              {
                n: '1',
                t: 'Escaneá el Código QR Virgen',
                d: 'Apuntá la cámara de tu celular al código QR de tu llavero ResQ. Se abrirá el formulario de alta sin instalar ninguna app.',
              },
              {
                n: '2',
                t: 'Cargá tu Ficha Médica y Contactos',
                d: 'Completá tu grupo sanguíneo, alergias, obra social, foto, datos de tu moto y hasta 3 contactos de emergencia.',
              },
              {
                n: '3',
                t: '100% Dinámico y Editable en Viaje',
                d: 'Tu QR queda protegido con tu clave personal. Podés actualizar teléfonos, seguro o medicación cuando quieras.',
              },
            ].map((step) => (
              <div
                key={step.n}
                className="flex items-start"
                style={{
                  gap: '2mm',
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.25mm solid rgba(255,255,255,0.09)',
                  borderRadius: '2mm',
                  padding: '1.7mm 2mm',
                }}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full bg-[#FF5500] font-black text-white"
                  style={{ width: '4.8mm', height: '4.8mm', fontSize: '6.2pt' }}
                >
                  {step.n}
                </div>
                <div>
                  <h4 className="font-extrabold uppercase text-white" style={{ fontSize: '6pt' }}>
                    {step.t}
                  </h4>
                  <p className="text-slate-300" style={{ fontSize: '5.3pt', lineHeight: 1.25 }}>
                    {step.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(230,0,0,0.08)',
            border: '0.3mm solid rgba(230,0,0,0.45)',
            borderRadius: '2mm',
            padding: '2mm 2.5mm',
          }}
        >
          <h5 className="font-black uppercase text-red-400" style={{ fontSize: '5.8pt' }}>
            🚨 JERARQUÍA DE RESCATE EN EMERGENCIA
          </h5>
          <div
            className="grid grid-cols-2 text-slate-200"
            style={{ fontSize: '5.1pt', gap: '0.8mm 2mm', marginTop: '1mm' }}
          >
            <span>▪ Alerta GPS vía WhatsApp</span>
            <span>▪ Grupo sanguíneo visible</span>
            <span>▪ Llamada 1-Toque a Familia</span>
            <span>▪ Marcación rápida 107 / 911</span>
            <span>▪ Idiomas ES / EN / PT</span>
            <span>▪ Privacidad Antirrobo</span>
          </div>
        </div>

        <div
          className="flex items-center justify-between bg-[#0E1012]"
          style={{
            border: '0.3mm solid #334155',
            borderRadius: '2mm',
            padding: '1.6mm 2.5mm',
          }}
        >
          <div>
            <span className="block font-bold uppercase text-slate-400" style={{ fontSize: '4.8pt' }}>
              SERIE / CÓDIGO QR
            </span>
            <span className="font-mono font-black text-white" style={{ fontSize: '7.5pt' }}>
              {serialCode}
            </span>
          </div>
          <div className="text-right">
            <span className="block font-bold uppercase text-slate-400" style={{ fontSize: '4.8pt' }}>
              ORIGEN PATAGONIA
            </span>
            <span className="font-mono font-black text-[#FF5500]" style={{ fontSize: '7pt' }}>
              USHUAIA · FIN DEL MUNDO
            </span>
          </div>
        </div>
      </div>

      <div
        className="bg-[#0E1012] text-center"
        style={{
          borderTop: '0.5mm solid #FF5500',
          padding: '2.2mm 3mm 2.8mm 3mm',
        }}
      >
        <div className="font-black text-white" style={{ fontSize: '8.2pt' }}>
          Res<span className="text-[#FF5500]">Q</span> Patagonia · LAT 54° 48&apos; S
        </div>
        <div
          className="font-bold uppercase text-slate-400"
          style={{ fontSize: '4.9pt', letterSpacing: '0.11em', marginTop: '0.6mm' }}
        >
          RUTA NACIONAL N° 3 • TIERRA DEL FUEGO • ARGENTINA
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 sm:p-6 print:bg-white print:p-0">
      {/* Barra de configuración (Se oculta automáticamente al imprimir en A4) */}
      <div className="max-w-5xl mx-auto mb-6 bg-[#131b2e] border border-orange-500/40 rounded-2xl p-4 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-[#FF5500] uppercase">
              FASE 4 DEL DOSSIER • PACKAGING &amp; ESTRATEGIA COMERCIAL
            </p>
            <h1 className="text-2xl font-black text-white">
              Generador de Blíster Comercial ResQ (Escala Real 1:1 en A4)
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              ← Volver al Admin
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white shadow-lg"
            >
              🖨️ Imprimir Hoja A4 (Escala 100%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-orange-300 mb-1">
              Modelo de Hardware (Según Dossier Sección 3)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEdition('moto')}
                className={`py-2 px-3 rounded-xl text-xs font-black border transition ${
                  edition === 'moto'
                    ? 'bg-[#FF5500] text-white border-orange-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                🏍️ ResQ Moto Edition (Circular)
              </button>
              <button
                type="button"
                onClick={() => setEdition('explorer')}
                className={`py-2 px-3 rounded-xl text-xs font-black border transition ${
                  edition === 'explorer'
                    ? 'bg-[#FF5500] text-white border-orange-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                🏔️ ResQ Explorer (Bumper)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Código Blíster #1 (Superior)
            </label>
            <input
              type="text"
              value={code1}
              onChange={(e) => setCode1(e.target.value.toUpperCase())}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Código Blíster #2 (Inferior)
            </label>
            <input
              type="text"
              value={code2}
              onChange={(e) => setCode2(e.target.value.toUpperCase())}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white"
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          💡 <strong>Tip de armado:</strong> Cada tarjeta mide exactamente <strong>92 × 138 mm</strong>. En una hoja A4 entran <strong>2 Blísters completos (Frente + Dorso enfrentados)</strong>. Podés imprimir en papel ilustración de 300g, recortar el par unido por el medio y doblarlo al centro (quedando Frente y Dorso pegados de doble espesor 600g súper rígido), hacer la ranura para pasar la argolla o precinto, ¡y colgar en el exhibidor!
        </p>
      </div>

      {/* Lienzo Hoja A4 a Escala Milimétrica Exacta */}
      <div className="flex justify-center">
        <div
          className="bg-white shadow-2xl print:shadow-none grid justify-center content-center"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '6mm',
            gridTemplateColumns: 'repeat(2, 92mm)',
            gridTemplateRows: 'repeat(2, 138mm)',
            gap: '4mm',
          }}
        >
          {renderFrontCard(code1)}
          {renderBackCard(code1)}
          {renderFrontCard(code2)}
          {renderBackCard(code2)}
        </div>
      </div>
    </main>
  );
}
