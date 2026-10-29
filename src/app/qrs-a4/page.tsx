'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

interface QrTagMinimal {
  code: string;
  batch_name: string;
  status: 'unclaimed' | 'active' | 'paused';
}

type CutShape = 'round' | 'round_ring' | 'square';
type LabelMode = 'outside' | 'inside' | 'both' | 'none';

function buildQrVector(
  text: string,
  ecc: 'L' | 'M' | 'Q' | 'H'
): { size: number; path: string } {
  const qr = QRCode.create(text, { errorCorrectionLevel: ecc });
  const size = qr.modules.size;
  const data = qr.modules.data;
  let d = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        d += `M${c},${r}h1v1h-1z`;
      }
    }
  }
  return { size, path: d };
}

function QrsA4Content() {
  const searchParams = useSearchParams();

  // Modo de selección de rango: 'numeric' (Prefijo + Desde + Hasta) o 'database' (Desde lista Supabase)
  const [rangeMode, setRangeMode] = useState<'numeric' | 'database'>('numeric');

  // Rango numérico (XXX-0000)
  const [prefix, setPrefix] = useState('USH');
  const [startStr, setStartStr] = useState('0001');
  const [endStr, setEndStr] = useState('0024');

  // Datos desde Supabase para selección de rango existente
  const [dbTags, setDbTags] = useState<QrTagMinimal[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbFilterStatus, setDbFilterStatus] = useState<'all' | 'unclaimed' | 'active'>('all');
  const [dbFromCode, setDbFromCode] = useState('');
  const [dbToCode, setDbToCode] = useState('');

  // Geometría física 1:1 en milímetros (calibrada para cavidad trasera del llavero ResQ)
  const [cutDiameterMm, setCutDiameterMm] = useState(32); // En el .3mf actual (escala 81% = 56.8mm exterior), la cavidad blanca mide 31.86mm (32mm); a 70mm mide 39.3mm
  const [qrSquareMm, setQrSquareMm] = useState(20); // Inscrito holgado lejos del menisco de resina
  const [gapMm, setGapMm] = useState(3); // Separación entre medallones para tijera/sacabocados
  const [cutShape, setCutShape] = useState<CutShape>('round');
  const [labelMode, setLabelMode] = useState<LabelMode>('outside');
  const [eccLevel, setEccLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [cutLineColor, setCutLineColor] = useState<'light' | 'dark' | 'dashed'>('dashed');

  const baseUrl = 'https://resq-qr.vercel.app/q/';

  // Leer parámetros iniciales desde URL (si viene desde /admin)
  useEffect(() => {
    const qPrefix = searchParams.get('prefix');
    const qFrom = searchParams.get('from');
    const qTo = searchParams.get('to');
    if (qPrefix) setPrefix(qPrefix.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3));
    if (qFrom) setStartStr(qFrom.replace(/\D/g, '').slice(0, 4).padStart(4, '0'));
    if (qTo) setEndStr(qTo.replace(/\D/g, '').slice(0, 4).padStart(4, '0'));
  }, [searchParams]);

  // Cargar QRs existentes de Supabase por si desea elegir un rango de la base
  useEffect(() => {
    async function loadTags() {
      setLoadingDb(true);
      if (!supabase) {
        setLoadingDb(false);
        return;
      }
      const { data } = await supabase
        .from('qr_tags')
        .select('code, batch_name, status')
        .order('code', { ascending: true });

      const list = (data || []) as QrTagMinimal[];
      setDbTags(list);
      if (list.length > 0) {
        setDbFromCode(list[0].code);
        setDbToCode(list[Math.min(list.length - 1, 23)].code);
      }
      setLoadingDb(false);
    }
    loadTags();
  }, []);

  const filteredDbTags = useMemo(() => {
    return dbTags.filter((t) => {
      if (dbFilterStatus === 'unclaimed') return t.status !== 'active';
      if (dbFilterStatus === 'active') return t.status === 'active';
      return true;
    });
  }, [dbTags, dbFilterStatus]);

  // Calcular el máximo lado seguro del QR dentro del círculo
  const maxSafeQrMm = useMemo(() => {
    if (cutShape === 'square') return Math.max(12, cutDiameterMm - 4);
    // Inscrito en círculo: (Diámetro - margen) / sqrt(2)
    return Math.round(((cutDiameterMm - 4) / Math.SQRT2) * 10) / 10;
  }, [cutDiameterMm, cutShape]);

  // Ajustar automáticamente el tamaño del QR cuando cambia el diámetro de corte
  const handleSelectPresetDiameter = (diam: number) => {
    setCutDiameterMm(diam);
    const recommendedQr = Math.round(((diam - 5) / Math.SQRT2));
    setQrSquareMm(Math.max(12, Math.min(recommendedQr, diam - 6)));
  };

  // Lista final de códigos a imprimir según el rango seleccionado
  const codesToPrint = useMemo(() => {
    if (rangeMode === 'numeric') {
      const cleanPref = (prefix.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'USH').padEnd(
        3,
        'X'
      );
      const s = parseInt(startStr, 10);
      const e = parseInt(endStr, 10);
      if (isNaN(s) || isNaN(e) || e < s) return [];
      const count = Math.min(500, e - s + 1);
      const result: string[] = [];
      for (let i = 0; i < count; i++) {
        result.push(`${cleanPref}-${String(s + i).padStart(4, '0')}`);
      }
      return result;
    } else {
      if (filteredDbTags.length === 0) return [];
      const startIdx = Math.max(
        0,
        filteredDbTags.findIndex((t) => t.code === dbFromCode)
      );
      const endIdxRaw = filteredDbTags.findIndex((t) => t.code === dbToCode);
      const endIdx = endIdxRaw >= startIdx ? endIdxRaw : filteredDbTags.length - 1;
      return filteredDbTags.slice(startIdx, endIdx + 1).map((t) => t.code);
    }
  }, [rangeMode, prefix, startStr, endStr, filteredDbTags, dbFromCode, dbToCode]);

  // Cálculo de grilla A4 exacta (210mm x 297mm, área útil 194mm x 277mm)
  const layoutA4 = useMemo(() => {
    const usableWidthMm = 194;
    const usableHeightMm = 276;
    const extraLabelHeightMm = labelMode === 'outside' || labelMode === 'both' ? 4.2 : 0;
    const cellW = cutDiameterMm + gapMm;
    const cellH = cutDiameterMm + extraLabelHeightMm + gapMm;

    const cols = Math.max(1, Math.floor((usableWidthMm + gapMm) / cellW));
    const rows = Math.max(1, Math.floor((usableHeightMm + gapMm) / cellH));
    const perPage = cols * rows;

    const pages: string[][] = [];
    for (let i = 0; i < codesToPrint.length; i += perPage) {
      pages.push(codesToPrint.slice(i, i + perPage));
    }
    if (pages.length === 0) pages.push([]);

    return {
      cols,
      rows,
      perPage,
      pages,
      extraLabelHeightMm,
    };
  }, [cutDiameterMm, gapMm, labelMode, codesToPrint]);

  // Botón rápido para llenar exactamente 1 hoja A4 desde el número inicial
  const handleFillExactlyPages = (numPages: number) => {
    const s = parseInt(startStr, 10) || 1;
    const targetEnd = Math.min(9999, s + layoutA4.perPage * numPages - 1);
    setEndStr(String(targetEnd).padStart(4, '0'));
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 pb-16 print:bg-white print:text-black print:pb-0">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html,
          body {
            width: 210mm;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            page-break-after: always;
            break-after: page;
          }
          .a4-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* BARRA DE CONTROL SUPERIOR (Se oculta al imprimir en A4) */}
      <div className="no-print max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-[#ff5500] uppercase">
              PRODUCCIÓN EN PAPEL / VINILO + DOMING DE RESINA EPOXI • ESCALA 1:1
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Impresor A4 de QRs por Rango (Para Resina)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera planchas A4 vectoriales de alta definición listas para recortar, pegar en la cavidad trasera del llavero 3D y aplicar gota de resina.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              ← Volver al Admin
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={codesToPrint.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-600/30 transition"
            >
              🖨️ Imprimir {layoutA4.pages.length} Hoja(s) A4 ({codesToPrint.length} QRs)
            </button>
          </div>
        </header>

        {/* PANEL 1: SELECCIÓN DEL RANGO DE CÓDIGOS QR */}
        <section className="bg-[#131b2e] border border-orange-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-400">
                1. Elegir Rango Determinado de Códigos QR a Imprimir
              </h2>
              <p className="text-[11px] text-slate-400">
                Podés escribir cualquier rango numérico <span className="font-mono text-white">XXX-0000</span> (Desde / Hasta) o seleccionar un rango directamente de tus códigos guardados en Supabase.
              </p>
            </div>

            <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setRangeMode('numeric')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  rangeMode === 'numeric'
                    ? 'bg-[#ff5500] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔢 Por Rango Numérico (Desde - Hasta)
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('database')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  rangeMode === 'database'
                    ? 'bg-[#ff5500] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗄️ Desde Base de Datos ({dbTags.length})
              </button>
            </div>
          </div>

          {rangeMode === 'numeric' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prefijo (3 Letras)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={prefix}
                    onChange={(e) =>
                      setPrefix(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3))
                    }
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono font-black uppercase tracking-widest text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Desde Número (0000)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={startStr}
                    onChange={(e) => setStartStr(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onBlur={() => {
                      if (startStr) setStartStr(startStr.padStart(4, '0'));
                    }}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hasta Número (0000)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={endStr}
                    onChange={(e) => setEndStr(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onBlur={() => {
                      if (endStr) setEndStr(endStr.padStart(4, '0'));
                    }}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillExactlyPages(1)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-orange-500/40 text-[11px] font-bold text-orange-300 transition"
                  >
                    📄 Completar 1 Hoja ({layoutA4.perPage} QRs)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillExactlyPages(2)}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 transition"
                  >
                    2 Hojas ({layoutA4.perPage * 2})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Filtrar por Estado
                </label>
                <select
                  value={dbFilterStatus}
                  onChange={(e) => {
                    const next = e.target.value as 'all' | 'unclaimed' | 'active';
                    setDbFilterStatus(next);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                >
                  <option value="all">Todos los códigos ({dbTags.length})</option>
                  <option value="unclaimed">
                    Solo No Activos / Vírgenes (
                    {dbTags.filter((t) => t.status !== 'active').length})
                  </option>
                  <option value="active">
                    Solo Activos ({dbTags.filter((t) => t.status === 'active').length})
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desde Código
                </label>
                <select
                  value={dbFromCode}
                  onChange={(e) => setDbFromCode(e.target.value)}
                  disabled={loadingDb || filteredDbTags.length === 0}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white"
                >
                  {filteredDbTags.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} ({t.batch_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hasta Código
                </label>
                <select
                  value={dbToCode}
                  onChange={(e) => setDbToCode(e.target.value)}
                  disabled={loadingDb || filteredDbTags.length === 0}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white"
                >
                  {filteredDbTags.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} ({t.batch_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Resumen del rango activo */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Rango seleccionado:</span>
              {codesToPrint.length > 0 ? (
                <>
                  <span className="font-mono font-black text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-700">
                    {codesToPrint[0]} → {codesToPrint[codesToPrint.length - 1]}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ({codesToPrint.length} códigos en {layoutA4.pages.length} hoja
                    {layoutA4.pages.length > 1 ? 's' : ''} A4 · {layoutA4.cols}×{layoutA4.rows} ={' '}
                    {layoutA4.perPage} por hoja)
                  </span>
                </>
              ) : (
                <span className="text-red-400 font-bold">
                  ⚠️ Rango vacío (verificá que &quot;Hasta&quot; sea mayor o igual a &quot;Desde&quot;)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              Al imprimir en Chrome/Edge: verificá <strong>Escala: 100% (Tamaño real)</strong> y{' '}
              <strong>Márgenes: Ninguno</strong>.
            </span>
          </div>
        </section>

        {/* PANEL 2: CALIBRACIÓN DE MEDIDAS PARA CAVIDAD 3D Y RESINA */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-400">
                2. Calibración de Diámetro de Corte y Margen para Resina Epoxi
              </h2>
              <p className="text-[11px] text-slate-400">
                En tu archivo <span className="font-mono text-slate-200">hi3d-resq-completo-4-colores.3mf</span> el hueco circular trasero mide <strong>Ø 32 mm</strong> (o <strong>Ø 39 mm</strong> si lo escalás a 70 mm). Elegí el preajuste o ingresá los milímetros exactos.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPresetDiameter(30)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  cutDiameterMm === 30
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                Ø 30 mm
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDiameter(32)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  cutDiameterMm === 32
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ⭐ Ø 32 mm (Cavidad .3MF actual)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDiameter(35)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  cutDiameterMm === 35
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                Ø 35 mm
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDiameter(39)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  cutDiameterMm === 39
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ⭐ Ø 39 mm (Escala 70 mm)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Diámetro Corte (mm)
              </label>
              <input
                type="number"
                step="0.5"
                min={18}
                max={70}
                value={cutDiameterMm}
                onChange={(e) => setCutDiameterMm(parseFloat(e.target.value || '39'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Lado QR Interno (mm)
              </label>
              <input
                type="number"
                step="0.5"
                min={12}
                max={60}
                value={qrSquareMm}
                onChange={(e) => setQrSquareMm(parseFloat(e.target.value || '24'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
              <span className="text-[10px] text-slate-400">Máx inscrito: {maxSafeQrMm}mm</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Separación (mm)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={15}
                value={gapMm}
                onChange={(e) => setGapMm(parseFloat(e.target.value || '3'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Diseño del Medallón
              </label>
              <select
                value={cutShape}
                onChange={(e) => setCutShape(e.target.value as CutShape)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="round">⚪ Círculo Limpio (Corte)</option>
                <option value="round_ring">🔘 Círculo + Aro Negro</option>
                <option value="square">⬛ Cuadrado</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Texto del Código (ID)
              </label>
              <select
                value={labelMode}
                onChange={(e) => setLabelMode(e.target.value as LabelMode)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="outside">Fuera del círculo (Guía)</option>
                <option value="inside">Dentro del círculo</option>
                <option value="both">Dentro y Fuera</option>
                <option value="none">Sin texto (Solo QR)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Guía de Corte / ECC
              </label>
              <div className="flex gap-1">
                <select
                  value={cutLineColor}
                  onChange={(e) => setCutLineColor(e.target.value as 'light' | 'dark' | 'dashed')}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                >
                  <option value="dashed">Corte Punteado</option>
                  <option value="light">Línea Gris Fina</option>
                  <option value="dark">Línea Negra</option>
                </select>
                <select
                  value={eccLevel}
                  onChange={(e) => setEccLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono text-white"
                  title="Nivel de corrección de errores del QR"
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* VISTA PREVIA Y ÁREA DE IMPRESIÓN A4 (210mm x 297mm) */}
      <div className="flex flex-col items-center gap-8 print:block print:gap-0">
        {layoutA4.pages.map((pageCodes, pageIdx) => (
          <div
            key={pageIdx}
            className="a4-sheet bg-white text-black shadow-2xl border border-slate-700 flex flex-col justify-between"
            style={{
              width: '210mm',
              height: '297mm',
              padding: '8mm 8mm 7mm 8mm',
              boxSizing: 'border-box',
            }}
          >
            {/* Cabecera milimétrica de control de la hoja A4 */}
            <div
              className="flex items-center justify-between border-b border-neutral-300 pb-1.5 mb-2"
              style={{ fontSize: '7.5pt', fontFamily: 'monospace' }}
            >
              <div>
                <strong>RESQ · PLANCHA QR PARA RESINA EPOXI</strong> · Rango:{' '}
                <strong>
                  {pageCodes[0] || '-'} → {pageCodes[pageCodes.length - 1] || '-'}
                </strong>{' '}
                ({pageCodes.length} u.) · Corte: <strong>Ø {cutDiameterMm} mm</strong> (QR:{' '}
                {qrSquareMm} mm)
              </div>
              <div className="flex items-center gap-3">
                {/* Regla de verificación de escala 1:1 de 20mm */}
                <div className="flex items-center gap-1">
                  <span>Test 20mm:</span>
                  <div
                    style={{
                      width: '20mm',
                      height: '2mm',
                      borderLeft: '1px solid #000',
                      borderRight: '1px solid #000',
                      borderBottom: '1px solid #000',
                    }}
                  />
                </div>
                <span>
                  Hoja {pageIdx + 1}/{layoutA4.pages.length}
                </span>
              </div>
            </div>

            {/* Grilla exacta de medallones QR */}
            <div className="flex-1 flex items-start justify-center">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${layoutA4.cols}, ${cutDiameterMm}mm)`,
                  columnGap: `${gapMm}mm`,
                  rowGap: `${gapMm}mm`,
                  justifyContent: 'center',
                  alignContent: 'start',
                }}
              >
                {pageCodes.map((code) => {
                  const targetUrl = `${baseUrl}${code}`;
                  const vec = buildQrVector(targetUrl, eccLevel);
                  const borderStyle =
                    cutLineColor === 'dashed'
                      ? '0.35mm dashed #6b7280'
                      : cutLineColor === 'light'
                      ? '0.25mm solid #9ca3af'
                      : '0.35mm solid #111827';

                  return (
                    <div
                      key={code}
                      className="flex flex-col items-center"
                      style={{
                        width: `${cutDiameterMm}mm`,
                      }}
                    >
                      {/* Medallón de corte (Circular o Cuadrado) */}
                      <div
                        className="relative flex flex-col items-center justify-center bg-white"
                        style={{
                          width: `${cutDiameterMm}mm`,
                          height: `${cutDiameterMm}mm`,
                          borderRadius: cutShape === 'square' ? '2mm' : '50%',
                          border: borderStyle,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Anillo decorativo interno opcional */}
                        {cutShape === 'round_ring' && (
                          <div
                            className="pointer-events-none"
                            style={{
                              position: 'absolute',
                              inset: '1.1mm',
                              borderRadius: '50%',
                              border: '0.7mm solid #000000',
                            }}
                          />
                        )}

                        {/* Vector SVG del Código QR (100% nítido a cualquier DPI) */}
                        <svg
                          viewBox={`0 0 ${vec.size} ${vec.size}`}
                          shapeRendering="crispEdges"
                          style={{
                            width: `${qrSquareMm}mm`,
                            height: `${qrSquareMm}mm`,
                            display: 'block',
                          }}
                        >
                          <rect width={vec.size} height={vec.size} fill="#ffffff" />
                          <path d={vec.path} fill="#000000" />
                        </svg>

                        {/* Etiqueta dentro del círculo (debajo del QR) */}
                        {(labelMode === 'inside' || labelMode === 'both') && (
                          <span
                            style={{
                              fontSize: '5.5pt',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              letterSpacing: '0.04em',
                              marginTop: '0.7mm',
                              lineHeight: 1,
                              color: '#000000',
                            }}
                          >
                            {code}
                          </span>
                        )}
                      </div>

                      {/* Etiqueta fuera de la línea de corte (para identificar cada recorte sin dejar texto dentro del medallón) */}
                      {(labelMode === 'outside' || labelMode === 'both') && (
                        <div
                          style={{
                            height: '3.6mm',
                            marginTop: '0.5mm',
                            fontSize: '6.5pt',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: '#374151',
                            lineHeight: 1,
                            textAlign: 'center',
                          }}
                        >
                          {code}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pie de hoja */}
            <div
              className="border-t border-neutral-200 pt-1 text-center text-neutral-500"
              style={{ fontSize: '6.5pt', fontFamily: 'monospace' }}
            >
              Imprimir al 100% de escala (Sin ajustar a página) · Diámetro de corte Ø {cutDiameterMm}{' '}
              mm calibrado para cavidad trasera ResQ (Ø 39.3 mm) + Doming de Resina Epoxi
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QrsA4Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center text-sm">
          Cargando generador A4 de QRs para resina...
        </div>
      }
    >
      <QrsA4Content />
    </Suspense>
  );
}
