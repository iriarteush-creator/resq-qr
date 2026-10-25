'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function BlisterGeneratorPage() {
  const [cleanPrint, setCleanPrint] = useState(false);

  const renderFrontCard = () => (
    <div
      className="relative overflow-hidden bg-[#1E2023] text-[#F4F6F8]"
      style={{
        width: '90mm',
        height: '130mm',
        borderRadius: '5.5mm',
        border: '0.25mm solid #334155',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Gráfica Vectorial HUD Exacta al Diseño de Tienda */}
      <svg
        viewBox="0 0 92 138"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Troquel Colgador Europeo (Eurohole) */}
        <path
          d="M 33 7.5 H 41.5 A 3.5 3.5 0 0 1 49.5 7.5 H 59 A 2 2 0 0 1 61 9.5 V 11 A 2 2 0 0 1 59 13 H 33 A 2 2 0 0 1 31 11 V 9.5 A 2 2 0 0 1 33 7.5 Z"
          fill="#ffffff"
          stroke="#475569"
          strokeWidth="0.25"
        />

        {/* Líneas técnicas superiores con esquina a 45° */}
        <polyline
          points="5.5,19 5.5,11.5 9.5,7.5 14,7.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />
        <polyline
          points="86.5,19 86.5,11.5 82.5,7.5 78,7.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />

        {/* Franjas sólidas naranjas laterales */}
        <path d="M 0 21.5 H 21.5 C 19.2 26.5, 19.2 31.5, 21.5 36.5 H 0 Z" fill="#FF5500" />
        <path d="M 92 21.5 H 70.5 C 72.8 26.5, 72.8 31.5, 70.5 36.5 H 92 Z" fill="#FF5500" />

        {/* Arcos parentéticos naranjas que enmarcan el logo ResQ central */}
        <path
          d="M 23.2 21.2 C 20.5 26.5, 20.5 31.5, 23.2 36.8"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <path
          d="M 68.8 21.2 C 71.5 26.5, 71.5 31.5, 68.8 36.8"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Reglas técnicas laterales con marcas de graduación encuadrando TAG SOS / FICHA MEDICA */}
        <line x1="5.5" y1="40.5" x2="5.5" y2="51.5" stroke="#FF5500" strokeWidth="0.55" />
        <line x1="5.5" y1="40.5" x2="9.2" y2="40.5" stroke="#FF5500" strokeWidth="0.55" />
        <line x1="5.5" y1="42.7" x2="8.5" y2="42.7" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="5.5" y1="44.9" x2="8.5" y2="44.9" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="5.5" y1="47.1" x2="8.5" y2="47.1" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="5.5" y1="49.3" x2="8.5" y2="49.3" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="5.5" y1="51.5" x2="9.2" y2="51.5" stroke="#FF5500" strokeWidth="0.55" />

        <line x1="86.5" y1="40.5" x2="86.5" y2="51.5" stroke="#FF5500" strokeWidth="0.55" />
        <line x1="82.8" y1="40.5" x2="86.5" y2="40.5" stroke="#FF5500" strokeWidth="0.55" />
        <line x1="83.5" y1="42.7" x2="86.5" y2="42.7" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="83.5" y1="44.9" x2="86.5" y2="44.9" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="83.5" y1="47.1" x2="86.5" y2="47.1" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="83.5" y1="49.3" x2="86.5" y2="49.3" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="82.8" y1="51.5" x2="86.5" y2="51.5" stroke="#FF5500" strokeWidth="0.55" />

        {/* Líneas horizontales superior e inferior de TAG SOS / FICHA MEDICA */}
        <line x1="11.5" y1="42.2" x2="80.5" y2="42.2" stroke="#FF5500" strokeWidth="0.45" />
        <line x1="11.5" y1="49.8" x2="80.5" y2="49.8" stroke="#FF5500" strokeWidth="0.45" />

        {/* Líneas laterales del contenedor del blíster */}
        <polyline
          points="8.5,55 5.5,55 5.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />
        <polyline
          points="83.5,55 86.5,55 86.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />

        {/* Marco técnico inferior con chaflanes a 45° para USHUAIA PATAGONIA */}
        <polyline
          points="5.5,119.5 10.5,125 32.5,125 35.5,121.8 56.5,121.8 59.5,125 81.5,125 86.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />

        {/* Esquinas exteriores inferiores dobles */}
        <polyline
          points="4.5,124 9.5,129.2 29,129.2"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.5"
        />
        <polyline
          points="87.5,124 82.5,129.2 63,129.2"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.5"
        />
      </svg>

      {/* Logo ResQ + MOTO EDITION */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '20.2mm', zIndex: 2 }}
      >
        <div
          className="font-black text-white leading-none"
          style={{ fontSize: '25.5pt', letterSpacing: '-0.03em' }}
        >
          Res<span className="text-[#FF5500]">Q</span>
        </div>
        <div
          className="font-bold uppercase text-[#FF5500]"
          style={{ fontSize: '7.6pt', letterSpacing: '0.18em', marginTop: '1.1mm' }}
        >
          MOTO EDITION
        </div>
      </div>

      {/* Subtítulo enmarcado: TAG SOS / FICHA MEDICA */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '43.4mm', zIndex: 2 }}
      >
        <div
          className="font-extrabold uppercase text-white"
          style={{ fontSize: '9.3pt', letterSpacing: '0.05em' }}
        >
          TAG SOS / FICHA MEDICA
        </div>
      </div>

      {/* Eslogan: Escaneá. Asistí. Rescatá. */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '51.6mm', zIndex: 2 }}
      >
        <div
          className="font-semibold text-slate-200"
          style={{ fontSize: '7.5pt', letterSpacing: '0.02em' }}
        >
          Escaneá. Asistí. Rescatá.
        </div>
      </div>

      {/* ZONA CENTRAL PARA 1 SOLO DISPOSITIVO (58.5mm a 117.5mm) */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          top: '58.5mm',
          left: '9.5mm',
          right: '9.5mm',
          height: '59mm',
          borderRadius: '4.5mm',
          border: '0.35mm solid rgba(255,255,255,0.14)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.28) 100%)',
          zIndex: 2,
        }}
      >
        {!cleanPrint ? (
          <div className="flex flex-col items-center justify-center">
            <div
              className="flex items-center justify-center"
              style={{
                width: '12mm',
                height: '6.5mm',
                background: '#141618',
                border: '0.5mm solid #2d3136',
                borderRadius: '2.5mm 2.5mm 0 0',
                marginBottom: '-1.5mm',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  width: '6mm',
                  height: '2.2mm',
                  background: '#0e1012',
                  borderRadius: '1mm',
                }}
              />
            </div>

            <div
              className="relative flex flex-col items-center justify-between"
              style={{
                width: '48mm',
                height: '48mm',
                borderRadius: '50%',
                background: '#18191A',
                border: '2.6mm solid #FF5500',
                boxShadow: '0 3mm 8mm rgba(0,0,0,0.65), inset 0 0 0 0.8mm #0e1012',
                padding: '3.2mm',
              }}
            >
              <span
                className="font-black text-white"
                style={{ fontSize: '6.8pt', letterSpacing: '0.04em' }}
              >
                ResQ
              </span>
              <div
                className="relative flex items-center justify-center"
                style={{ width: '16mm', height: '16mm' }}
              >
                <div
                  className="absolute bg-[#E60000]"
                  style={{ width: '15.5mm', height: '5.5mm', borderRadius: '0.8mm' }}
                />
                <div
                  className="absolute bg-[#E60000]"
                  style={{ width: '5.5mm', height: '15.5mm', borderRadius: '0.8mm' }}
                />
              </div>
              <span
                className="font-extrabold text-white"
                style={{ fontSize: '5.6pt', letterSpacing: '0.08em' }}
              >
                EMERGENCY ID
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div
              style={{
                width: '12mm',
                height: '2.8mm',
                border: '0.3mm dashed #64748b',
                borderRadius: '1mm',
                marginBottom: '2mm',
              }}
            />
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                width: '50mm',
                height: '50mm',
                borderRadius: '50%',
                border: '0.4mm dashed rgba(255,85,0,0.55)',
                padding: '4mm',
              }}
            >
              <span
                className="font-extrabold uppercase text-[#FF5500]"
                style={{ fontSize: '5.8pt', letterSpacing: '0.08em' }}
              >
                POSICIÓN 1 UNIDAD
              </span>
              <span className="text-slate-400" style={{ fontSize: '5pt', marginTop: '1mm' }}>
                Centrar Llavero ResQ Aquí
                <br />
                (Ø 50 mm)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pie Técnico: USHUAIA PATAGONIA */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ bottom: '6.2mm', zIndex: 2 }}
      >
        <div
          className="font-black uppercase text-white leading-none"
          style={{ fontSize: '8.2pt', letterSpacing: '0.08em' }}
        >
          USHUAIA
        </div>
        <div
          className="font-semibold uppercase text-slate-400"
          style={{ fontSize: '5.2pt', letterSpacing: '0.22em', marginTop: '0.9mm' }}
        >
          PATAGONIA
        </div>
      </div>
    </div>
  );

  const renderBackCard = () => (
    <div
      className="relative overflow-hidden bg-[#1E2023] text-[#F4F6F8]"
      style={{
        width: '90mm',
        height: '130mm',
        borderRadius: '5.5mm',
        border: '0.25mm solid #334155',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <svg
        viewBox="0 0 92 138"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <path
          d="M 33 7.5 H 41.5 A 3.5 3.5 0 0 1 49.5 7.5 H 59 A 2 2 0 0 1 61 9.5 V 11 A 2 2 0 0 1 59 13 H 33 A 2 2 0 0 1 31 11 V 9.5 A 2 2 0 0 1 33 7.5 Z"
          fill="#ffffff"
          stroke="#475569"
          strokeWidth="0.25"
        />
        <polyline
          points="5.5,19 5.5,11.5 9.5,7.5 14,7.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />
        <polyline
          points="86.5,19 86.5,11.5 82.5,7.5 78,7.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />

        <path d="M 0 21.5 H 18.5 C 16.5 25.5, 16.5 29.5, 18.5 33.5 H 0 Z" fill="#FF5500" />
        <path d="M 92 21.5 H 73.5 C 75.5 25.5, 75.5 29.5, 73.5 33.5 H 92 Z" fill="#FF5500" />

        <path
          d="M 20.2 21.2 C 18 25.5, 18 29.5, 20.2 33.8"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
        <path
          d="M 71.8 21.2 C 74 25.5, 74 29.5, 71.8 33.8"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.75"
          strokeLinecap="round"
        />

        <polyline
          points="8.5,38 5.5,38 5.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />
        <polyline
          points="83.5,38 86.5,38 86.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />

        <polyline
          points="5.5,119.5 10.5,125 32.5,125 35.5,121.8 56.5,121.8 59.5,125 81.5,125 86.5,119.5"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.55"
        />
        <polyline
          points="4.5,124 9.5,129.2 29,129.2"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.5"
        />
        <polyline
          points="87.5,124 82.5,129.2 63,129.2"
          fill="none"
          stroke="#FF5500"
          strokeWidth="0.5"
        />
      </svg>

      {/* Cabecera Dorso */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '21.5mm', zIndex: 2 }}
      >
        <div className="font-black text-white leading-none" style={{ fontSize: '18pt' }}>
          Res<span className="text-[#FF5500]">Q</span>
        </div>
        <div
          className="font-bold uppercase text-[#FF5500]"
          style={{ fontSize: '6pt', letterSpacing: '0.16em', marginTop: '0.8mm' }}
        >
          GUÍA RÁPIDA DE ACTIVACIÓN
        </div>
      </div>

      {/* Cuerpo Dorso */}
      <div
        className="absolute flex flex-col justify-between"
        style={{
          top: '38mm',
          left: '9.5mm',
          right: '9.5mm',
          bottom: '19mm',
          zIndex: 2,
        }}
      >
        <div className="flex flex-col" style={{ gap: '2.2mm' }}>
          {[
            {
              n: '1',
              t: 'Escaneá el QR de tu Llavero',
              d: 'Apuntá la cámara de tu celular al código QR del reverso. No requiere descargar aplicaciones.',
            },
            {
              n: '2',
              t: 'Completá tu Ficha Médica SOS',
              d: 'Cargá foto del piloto, grupo sanguíneo, alergias, obra social, datos de tu moto y hasta 3 contactos.',
            },
            {
              n: '3',
              t: '100% Dinámico y Editable',
              d: 'Ante una emergencia, el socorrista envía tu ubicación GPS exacta por WhatsApp con un solo toque.',
            },
          ].map((step) => (
            <div
              key={step.n}
              className="flex items-start"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '0.25mm solid rgba(255,85,0,0.35)',
                borderRadius: '2mm',
                padding: '2.2mm 2.5mm',
                gap: '2.2mm',
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full bg-[#FF5500] font-black text-white"
                style={{ width: '5mm', height: '5mm', fontSize: '6.5pt' }}
              >
                {step.n}
              </div>
              <div>
                <div className="font-extrabold uppercase text-white" style={{ fontSize: '6.3pt' }}>
                  {step.t}
                </div>
                <div
                  className="text-slate-300"
                  style={{ fontSize: '5.3pt', lineHeight: 1.25, marginTop: '0.4mm' }}
                >
                  {step.d}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '0.25mm solid rgba(255,255,255,0.12)',
            borderRadius: '2mm',
            padding: '2.2mm 2.8mm',
          }}
        >
          <div
            className="font-black uppercase text-[#FF5500]"
            style={{ fontSize: '5.8pt', letterSpacing: '0.06em', marginBottom: '1.2mm' }}
          >
            ESPECIFICACIONES TÁCTICAS
          </div>
          <div
            className="grid grid-cols-2 text-slate-200"
            style={{ gap: '1mm 2mm', fontSize: '5.2pt' }}
          >
            <div>▪ Polímero Zero-Scratch</div>
            <div>▪ Envío de GPS vía WhatsApp</div>
            <div>▪ Resistente a agua y ripio</div>
            <div>▪ Llamada 1-Touch 107 / 911</div>
            <div>▪ Idiomas ES / EN / PT</div>
            <div>▪ Protección Antirrobo</div>
          </div>
        </div>

        <div
          className="flex items-center justify-between bg-[#141618]"
          style={{
            border: '0.3mm solid #334155',
            borderRadius: '2mm',
            padding: '1.8mm 2.8mm',
          }}
        >
          <div>
            <div className="font-bold uppercase text-slate-400" style={{ fontSize: '4.8pt' }}>
              SISTEMA OFICIAL
            </div>
            <div className="font-extrabold text-white" style={{ fontSize: '6.5pt' }}>
              Escaneá. Asistí. Rescatá.
            </div>
          </div>
          <div
            className="flex items-center justify-center bg-white"
            style={{ width: '24mm', height: '7mm', borderRadius: '1mm' }}
          >
            <span className="font-bold uppercase text-slate-400" style={{ fontSize: '4.5pt' }}>
              Sello / ID
            </span>
          </div>
        </div>
      </div>

      {/* Pie Técnico: USHUAIA PATAGONIA */}
      <div
        className="absolute inset-x-0 text-center"
        style={{ bottom: '6.2mm', zIndex: 2 }}
      >
        <div
          className="font-black uppercase text-white leading-none"
          style={{ fontSize: '8.2pt', letterSpacing: '0.08em' }}
        >
          USHUAIA
        </div>
        <div
          className="font-semibold uppercase text-slate-400"
          style={{ fontSize: '5.2pt', letterSpacing: '0.22em', marginTop: '0.9mm' }}
        >
          PATAGONIA
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 sm:p-6 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>
      <div className="max-w-5xl mx-auto mb-6 bg-[#131b2e] border border-orange-500/40 rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-[#FF5500] uppercase">
              DISEÑO OFICIAL DE TIENDA • 1 UNIDAD CENTRAL (GENÉRICO SIN NUMERACIÓN FIJA)
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Blíster Comercial ResQ Patagonia (Escala 1:1 en Hoja A4)
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCleanPrint(false)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition ${
                !cleanPrint
                  ? 'bg-[#FF5500] text-white border-orange-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              👁️ Con Llavero Presentado
            </button>
            <button
              type="button"
              onClick={() => setCleanPrint(true)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition ${
                cleanPrint
                  ? 'bg-[#FF5500] text-white border-orange-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              ✂️ Cartón Limpio (Para Imprenta)
            </button>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              ← Admin
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white shadow-lg"
            >
              🖨️ Imprimir A4
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="bg-white shadow-2xl print:shadow-none grid justify-center content-center"
          style={{
            width: '192mm',
            padding: '2mm',
            gridTemplateColumns: 'repeat(2, 90mm)',
            gridTemplateRows: 'repeat(2, 130mm)',
            gap: '4mm',
          }}
        >
          {renderFrontCard()}
          {renderBackCard()}
          {renderFrontCard()}
          {renderBackCard()}
        </div>
      </div>
    </main>
  );
}
