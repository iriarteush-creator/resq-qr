'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RiderProfile } from '@/lib/types';
import {
  downloadQr3mf,
  downloadQrStl,
  QrBaseShape,
  QrModuleStyle,
} from '@/lib/qr3d';

interface QrTagRow {
  code: string;
  batch_name: string;
  status: 'unclaimed' | 'active' | 'paused';
  owner_id: string | null;
  claimed_at: string | null;
  created_at: string;
  profile?: RiderProfile;
}

const MAKERWORLD_URL =
  'https://makerworld.com/es/makerlab/parametricModelMaker?designId=1754644&modelName=QR.scad';

export default function AdminDashboardPage() {
  // Autenticación del Administrador
  const [isAdminLogged, setIsAdminLogged] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showChangeCreds, setShowChangeCreds] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState('admin');
  const [newAdminPass, setNewAdminPass] = useState('');

  // Datos de QRs
  const [tags, setTags] = useState<QrTagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'unclaimed' | 'all'>('active');
  const [search, setSearch] = useState('');

  // Parámetros 3D (Idénticos al script QR.scad + Opciones de QR Redondo)
  const [baseShape, setBaseShape] = useState<QrBaseShape>('round');
  const [moduleStyle, setModuleStyle] = useState<QrModuleStyle>('square');
  const [qrSize, setQrSize] = useState(50);
  const [quietZone, setQuietZone] = useState(2);
  const [fillExtrude, setFillExtrude] = useState(1.0);
  const [codeExtrude, setCodeExtrude] = useState(0.6);
  const [eccLevel, setEccLevel] = useState<'L' | 'M' | 'Q' | 'H'>('L');

  // Generador de nuevos lotes en Supabase (Formato XXX-0000)
  const [batchPrefix, setBatchPrefix] = useState('USH');
  const [batchStartStr, setBatchStartStr] = useState('0051');
  const [batchEndStr, setBatchEndStr] = useState('0100');
  const [batchName, setBatchName] = useState('LOTE-02');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  const baseUrl = 'https://resq-qr.vercel.app/q/';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionOk = sessionStorage.getItem('resq_admin_session');
      if (sessionOk === 'true') {
        setIsAdminLogged(true);
      }
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const savedUser = localStorage.getItem('resq_admin_user') || 'admin';
    const savedPass = localStorage.getItem('resq_admin_pass') || 'ResQ2026!';

    if (adminUser.trim() === savedUser && adminPass === savedPass) {
      sessionStorage.setItem('resq_admin_session', 'true');
      setIsAdminLogged(true);
    } else {
      setLoginError('Usuario o contraseña de Administrador incorrectos.');
    }
  };

  const handleSaveNewCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || newAdminPass.length < 4) return;
    localStorage.setItem('resq_admin_user', newAdminUser.trim());
    localStorage.setItem('resq_admin_pass', newAdminPass);
    setShowChangeCreds(false);
    setAdminMsg(
      `✅ Credenciales de Administrador actualizadas (Usuario: ${newAdminUser.trim()}).`
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('resq_admin_session');
    setIsAdminLogged(false);
    setAdminPass('');
  };

  const fetchAllData = async () => {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [{ data: qrList }, { data: profilesList }] = await Promise.all([
      supabase.from('qr_tags').select('*').order('code', { ascending: true }),
      supabase.from('rider_profiles').select('*'),
    ]);

    const profileMap = new Map<string, RiderProfile>();
    (profilesList || []).forEach((p: RiderProfile) => {
      profileMap.set(p.qr_code, p);
    });

    const merged: QrTagRow[] = (qrList || []).map((t: QrTagRow) => {
      const prof = profileMap.get(t.code);
      return {
        ...t,
        status: prof ? 'active' : t.status,
        profile: prof,
      };
    });

    setTags(merged);
    const hasActive = merged.some((m) => m.status === 'active');
    if (!hasActive && tab === 'active') {
      setTab('unclaimed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminLogged) {
      fetchAllData();
    }
  }, [isAdminLogged]);

  // ==========================================================================
  // VALIDACIÓN EN TIEMPO REAL DEL LOTE (XXX-0000) CONTRA LA BASE DE DATOS
  // ==========================================================================
  const batchValidation = useMemo(() => {
    const cleanPrefix = batchPrefix.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    const isPrefixValid = /^[A-Z]{3}$/.test(cleanPrefix);

    const startNum = parseInt(batchStartStr, 10);
    const endNum = parseInt(batchEndStr, 10);
    const isRangeValid =
      !isNaN(startNum) &&
      !isNaN(endNum) &&
      startNum >= 0 &&
      endNum <= 9999 &&
      endNum >= startNum &&
      endNum - startNum + 1 <= 500;

    const existingSet = new Set(tags.map((t) => t.code.toUpperCase()));

    // Buscar el número más alto ya usado con este prefijo (ej. USH-0050 -> 50)
    let maxUsedForPrefix = 0;
    const prefixRegex = new RegExp(`^${cleanPrefix}-(\\d{4})$`);
    tags.forEach((t) => {
      const m = t.code.toUpperCase().match(prefixRegex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxUsedForPrefix) maxUsedForPrefix = n;
      }
    });

    const nextAvailableStart = Math.min(9999, maxUsedForPrefix + 1);
    const nextAvailableEnd = Math.min(9999, nextAvailableStart + 49);

    const requestedCodes: string[] = [];
    const duplicateCodes: string[] = [];

    if (isPrefixValid && isRangeValid) {
      for (let n = startNum; n <= endNum; n++) {
        const formattedCode = `${cleanPrefix}-${String(n).padStart(4, '0')}`;
        requestedCodes.push(formattedCode);
        if (existingSet.has(formattedCode)) {
          duplicateCodes.push(formattedCode);
        }
      }
    }

    const firstCodePreview =
      isPrefixValid && !isNaN(startNum)
        ? `${cleanPrefix}-${String(Math.max(0, Math.min(9999, startNum))).padStart(4, '0')}`
        : `${cleanPrefix || 'XXX'}-0000`;

    const lastCodePreview =
      isPrefixValid && !isNaN(endNum)
        ? `${cleanPrefix}-${String(Math.max(0, Math.min(9999, endNum))).padStart(4, '0')}`
        : `${cleanPrefix || 'XXX'}-0000`;

    return {
      cleanPrefix,
      isPrefixValid,
      startNum,
      endNum,
      isRangeValid,
      requestedCodes,
      duplicateCodes,
      maxUsedForPrefix,
      nextAvailableStart,
      nextAvailableEnd,
      firstCodePreview,
      lastCodePreview,
      canSubmit:
        isPrefixValid &&
        isRangeValid &&
        requestedCodes.length > 0 &&
        duplicateCodes.length === 0,
    };
  }, [batchPrefix, batchStartStr, batchEndStr, tags]);

  const handleUseNextAvailableRange = () => {
    setBatchStartStr(String(batchValidation.nextAvailableStart).padStart(4, '0'));
    setBatchEndStr(String(batchValidation.nextAvailableEnd).padStart(4, '0'));
  };

  // Crear nuevo lote de QRs vírgenes en Supabase verificando duplicados en tiempo real
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!batchValidation.isPrefixValid) {
      setAdminMsg('⚠️ El prefijo debe tener exactamente 3 letras mayúsculas (ej: USH).');
      return;
    }

    if (!batchValidation.isRangeValid) {
      setAdminMsg(
        '⚠️ La numeración debe ser de 4 dígitos (0000 a 9999), con "Hasta" mayor o igual a "Desde" (máx. 500 por lote).'
      );
      return;
    }

    setCreatingBatch(true);
    setAdminMsg('');

    // Doble chequeo en vivo contra Supabase antes de insertar para evitar cualquier duplicado
    const { data: liveTags, error: checkError } = await supabase
      .from('qr_tags')
      .select('code')
      .in('code', batchValidation.requestedCodes);

    if (checkError) {
      setCreatingBatch(false);
      setAdminMsg(`⚠️ Error al verificar en la base de datos: ${checkError.message}`);
      return;
    }

    if (liveTags && liveTags.length > 0) {
      setCreatingBatch(false);
      const found = liveTags.map((r) => r.code).slice(0, 6).join(', ');
      setAdminMsg(
        `❌ No se creó el lote: ${liveTags.length} código(s) ya existen en la base de datos (${found}${
          liveTags.length > 6 ? '...' : ''
        }). Usa el botón de sugerencia para elegir numeración libre.`
      );
      fetchAllData();
      return;
    }

    const cleanBatchName = batchName.trim().toUpperCase() || `LOTE-${batchValidation.cleanPrefix}`;
    const rowsToInsert = batchValidation.requestedCodes.map((code) => ({
      code,
      batch_name: cleanBatchName,
      status: 'unclaimed',
    }));

    const { error: insertError } = await supabase.from('qr_tags').insert(rowsToInsert);

    setCreatingBatch(false);
    if (insertError) {
      setAdminMsg(`⚠️ Error al crear lote: ${insertError.message}`);
    } else {
      setAdminMsg(
        `✅ Lote creado con éxito: ${rowsToInsert.length} códigos nuevos generados (${batchValidation.firstCodePreview} al ${batchValidation.lastCodePreview}).`
      );
      await fetchAllData();
    }
  };

  // Resetear / Liberar un QR para volverlo a estado virgen ('unclaimed')
  const handleResetQr = async (code: string) => {
    if (!supabase) return;
    const ok = window.confirm(
      `¿Seguro que deseas resetear el QR ${code} y dejarlo nuevamente NO ACTIVO (virgen)?`
    );
    if (!ok) return;

    await supabase.from('rider_profiles').delete().eq('qr_code', code);
    await supabase
      .from('qr_tags')
      .update({ status: 'unclaimed', owner_id: null, claimed_at: null })
      .eq('code', code);

    setAdminMsg(`🔄 El código ${code} volvió a estado No Activo (Virgen).`);
    fetchAllData();
  };

  // Copiar URL del QR al portapapeles y abrir MakerWorld
  const handleOpenMakerWorld = async (code: string) => {
    const targetUrl = `${baseUrl}${code}`;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setAdminMsg(
        `📋 URL copiada al portapapeles (${targetUrl}). Pégala con Ctrl+V en INPUT_TEXT de MakerWorld.`
      );
    } catch {
      // Fallback
    }
    window.open(MAKERWORLD_URL, '_blank', 'noopener,noreferrer');
  };

  // ==========================================================================
  // PANTALLA DE LOGIN DE ADMINISTRADOR
  // ==========================================================================
  if (!isAdminLogged) {
    return (
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="text-center border-b border-slate-800 pb-4">
            <p className="text-[10px] font-extrabold tracking-widest text-[#ff5500] uppercase">
              EXPEDITION SAFETY &amp; MEDICAL SOS • USHUAIA
            </p>
            <h1 className="text-3xl font-black text-white mt-1">ResQ Admin</h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso exclusivo para gestión de códigos QR e impresión 3D
            </p>
          </div>

          {loginError && (
            <div className="bg-red-950/80 border border-red-500 rounded-xl p-3 text-xs font-bold text-red-200">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuario Administrador
              </label>
              <input
                type="text"
                required
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
            >
              🔐 Ingresar al Panel Administrador
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-white">
              ← Volver al Portal Público
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeTags = tags.filter((t) => t.status === 'active');
  const unclaimedTags = tags.filter((t) => t.status !== 'active');
  const isRoundShape = baseShape !== 'square';

  const filteredTags = tags.filter((item) => {
    if (tab === 'active' && item.status !== 'active') return false;
    if (tab === 'unclaimed' && item.status === 'active') return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.batch_name.toLowerCase().includes(q) ||
      item.profile?.full_name?.toLowerCase().includes(q) ||
      item.profile?.bike_plate?.toLowerCase().includes(q) ||
      item.profile?.bike_brand_model?.toLowerCase().includes(q)
    );
  });

  // ==========================================================================
  // PANEL PRINCIPAL DE ADMINISTRADOR
  // ==========================================================================
  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 sm:p-6 pb-16">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabecera Admin */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-[#ff5500] uppercase">
              PANEL DE ADMINISTRACIÓN Y GENERADOR 3D • USHUAIA
            </p>
            <h1 className="text-3xl font-black text-white">ResQ · Administrador de QRs</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/qrs-a4?prefix=${batchValidation.cleanPrefix || 'USH'}&from=${batchStartStr || '0001'}&to=${batchEndStr || '0024'}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-900/30 border border-emerald-400/40"
            >
              🖨️ Imprimir QRs en A4 (Resina)
            </Link>
            <Link
              href="/blister"
              className="px-3.5 py-2 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-xs font-black text-white shadow"
            >
              📦 Imprimir Blísters A4
            </Link>
            <button
              type="button"
              onClick={fetchAllData}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-orange-400 border border-slate-700"
            >
              🔄 Actualizar
            </button>
            <button
              type="button"
              onClick={() => setShowChangeCreds(!showChangeCreds)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-800"
            >
              🔑 Cambiar Clave Admin
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-xs font-bold text-red-300 border border-red-500/30"
            >
              Salir
            </button>
          </div>
        </header>

        {showChangeCreds && (
          <form
            onSubmit={handleSaveNewCreds}
            className="bg-[#131b2e] border border-orange-500/50 rounded-2xl p-4 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nuevo Usuario Admin
              </label>
              <input
                type="text"
                required
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nueva Contraseña Admin
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Nueva clave"
                className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-xs font-black text-white"
            >
              Guardar Nueva Clave
            </button>
          </form>
        )}

        {adminMsg && (
          <div className="bg-slate-900 border border-orange-500/50 rounded-xl p-3 text-xs font-bold text-orange-300">
            {adminMsg}
          </div>
        )}

        {/* Tarjetas de Resumen: Total, Activos y No Activos */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`text-left p-5 rounded-2xl border transition ${
              tab === 'all'
                ? 'bg-[#131b2e] border-orange-500 shadow-lg shadow-orange-950/30'
                : 'bg-[#131b2e]/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Llaveros QR
            </span>
            <p className="text-4xl font-black text-white mt-1">{tags.length}</p>
            <span className="text-[11px] text-orange-400 font-semibold">
              Ver listado completo →
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('active')}
            className={`text-left p-5 rounded-2xl border transition ${
              tab === 'active'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-950/30'
                : 'bg-[#131b2e]/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              🟢 QRs Activos (Con Piloto)
            </span>
            <p className="text-4xl font-black text-white mt-1">{activeTags.length}</p>
            <span className="text-[11px] text-emerald-300 font-semibold">
              Ver pilotos registrados →
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('unclaimed')}
            className={`text-left p-5 rounded-2xl border transition ${
              tab === 'unclaimed'
                ? 'bg-orange-950/30 border-orange-500 shadow-lg shadow-orange-950/30'
                : 'bg-[#131b2e]/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              🟠 QRs No Activos (Vírgenes en Blíster)
            </span>
            <p className="text-4xl font-black text-white mt-1">{unclaimedTags.length}</p>
            <span className="text-[11px] text-orange-300 font-semibold">
              Ver disponibles para imprimir/entregar →
            </span>
          </button>
        </section>

        {/* CONFIGURADOR 3D INTEGRADO (Soporta QR Cuadrado y QR Redondo Medallón / Llavero) */}
        <section className="bg-[#131b2e] border border-orange-500/40 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-400">
                🖨️ Configurador de Modelo 3D Directo (QR Redondo / Cuadrado · Bambu Studio .3MF y .STL)
              </h2>
              <p className="text-[11px] text-slate-400">
                Elegí si querés generar tus llaveros en formato <strong>Redondo (Medallón Circular)</strong>,{' '}
                <strong>Redondo con Ojal para Llavero</strong> o <strong>Cuadrado</strong>. En modo redondo el QR se
                inscribe automáticamente dentro del disco con aro perimetral táctico.
              </p>
            </div>
          </div>

          {/* Selector rápido de Geometría del QR (Cuadrado vs Redondo) y Estilo de Píxeles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-orange-300">
                1. Forma de la Base 3D (QR Redondo / Cuadrado)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBaseShape('round')}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition border ${
                    baseShape === 'round'
                      ? 'bg-[#ff5500] text-white border-orange-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⚪ QR Redondo (Medallón)
                </button>
                <button
                  type="button"
                  onClick={() => setBaseShape('round_keychain')}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition border ${
                    baseShape === 'round_keychain'
                      ? 'bg-[#ff5500] text-white border-orange-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🔘 Redondo + Ojal Llavero
                </button>
                <button
                  type="button"
                  onClick={() => setBaseShape('square')}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition border ${
                    baseShape === 'square'
                      ? 'bg-[#ff5500] text-white border-orange-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⬛ QR Cuadrado Clásico
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-orange-300">
                2. Estilo de los Módulos / Píxeles del QR 3D
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModuleStyle('square')}
                  className={`py-2 px-3 rounded-xl text-[11px] font-black transition border ${
                    moduleStyle === 'square'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ▪️ Píxeles Cuadrados (Máxima Lectura)
                </button>
                <button
                  type="button"
                  onClick={() => setModuleStyle('round')}
                  className={`py-2 px-3 rounded-xl text-[11px] font-black transition border ${
                    moduleStyle === 'round'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⚫ Puntos Cilíndricos Redondos
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isRoundShape ? 'DIÁMETRO (mm)' : 'SIZE (Lado QR mm)'}
              </label>
              <input
                type="number"
                step="1"
                min={15}
                max={150}
                value={qrSize}
                onChange={(e) => setQrSize(parseFloat(e.target.value || '50'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                QUIET_ZONE (Margen mm)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={20}
                value={quietZone}
                onChange={(e) => setQuietZone(parseFloat(e.target.value || '2'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                FILL_EXTRUDE (Base mm)
              </label>
              <input
                type="number"
                step="0.1"
                min={0.2}
                max={10}
                value={fillExtrude}
                onChange={(e) => setFillExtrude(parseFloat(e.target.value || '1'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                CODE_EXTRUDE (QR mm)
              </label>
              <input
                type="number"
                step="0.1"
                min={0.2}
                max={5}
                value={codeExtrude}
                onChange={(e) => setCodeExtrude(parseFloat(e.target.value || '0.6'))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ERROR_CORRECTION
              </label>
              <select
                value={eccLevel}
                onChange={(e) => setEccLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white"
              >
                <option value="L">L (~7% - Más grande)</option>
                <option value="M">M (~15%)</option>
                <option value="Q">Q (~25%)</option>
                <option value="H">H (~30%)</option>
              </select>
            </div>
          </div>
        </section>

        {/* GENERADOR DE NUEVOS LOTES EN BASE DE DATOS (FORMATO XXX-0000 CON CHEQUEO DE DUPLICADOS) */}
        <section className="bg-[#131b2e] border border-orange-500/40 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-400">
                ➕ Nuevo Lote de QR (Formato Estricto <span className="font-mono text-white">XXX-0000</span> con Chequeo en Base de Datos)
              </h2>
              <p className="text-xs text-slate-400">
                Prefijo de <strong>3 letras mayúsculas</strong> + numeración de <strong>4 dígitos (Desde - Hasta)</strong>. Verifica automáticamente contra Supabase que ningún código <span className="font-mono text-slate-200">PREFIJO-0000</span> se repita.
              </p>
            </div>

            {batchValidation.isPrefixValid && (
              <button
                type="button"
                onClick={handleUseNextAvailableRange}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-orange-500/40 text-[11px] font-bold text-orange-300 transition"
              >
                ✨ Usar próxima numeración libre para {batchValidation.cleanPrefix}:{' '}
                <span className="font-mono text-white">
                  {String(batchValidation.nextAvailableStart).padStart(4, '0')} -{' '}
                  {String(batchValidation.nextAvailableEnd).padStart(4, '0')}
                </span>
              </button>
            )}
          </div>

          <form
            onSubmit={handleCreateBatch}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prefijo (3 Letras A-Z)
              </label>
              <input
                type="text"
                required
                maxLength={3}
                value={batchPrefix}
                onChange={(e) =>
                  setBatchPrefix(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3))
                }
                placeholder="USH"
                className={`w-full rounded-xl bg-slate-900 border px-3 py-2 text-sm font-mono font-black uppercase tracking-widest text-white ${
                  batchValidation.isPrefixValid ? 'border-emerald-500/60' : 'border-red-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Desde (4 dígitos 0000)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={4}
                value={batchStartStr}
                onChange={(e) => setBatchStartStr(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={() => {
                  if (batchStartStr) setBatchStartStr(batchStartStr.padStart(4, '0'));
                }}
                placeholder="0001"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hasta (4 dígitos 0000)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={4}
                value={batchEndStr}
                onChange={(e) => setBatchEndStr(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={() => {
                  if (batchEndStr) setBatchEndStr(batchEndStr.padStart(4, '0'));
                }}
                placeholder="0050"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Lote
              </label>
              <input
                type="text"
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value.toUpperCase())}
                placeholder="LOTE-02"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white"
              />
            </div>

            <button
              type="submit"
              disabled={creatingBatch || !batchValidation.canSubmit}
              className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                batchValidation.canSubmit
                  ? 'bg-[#ff5500] hover:bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {creatingBatch ? 'Verificando...' : 'Generar Lote'}
            </button>
          </form>

          {/* Barra de Estado de Validación del Rango XXX-0000 */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Vista previa del rango:</span>
              <span className="font-mono font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                {batchValidation.firstCodePreview} → {batchValidation.lastCodePreview}
              </span>
              {batchValidation.isRangeValid && (
                <span className="text-slate-400">
                  ({batchValidation.requestedCodes.length} códigos)
                </span>
              )}
              <Link
                href={`/qrs-a4?prefix=${batchValidation.cleanPrefix || 'USH'}&from=${batchStartStr || '0001'}&to=${batchEndStr || '0024'}`}
                className="ml-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider shadow transition"
              >
                🖨️ Imprimir este Rango en A4 (Resina)
              </Link>
            </div>

            <div>
              {!batchValidation.isPrefixValid ? (
                <span className="text-red-400 font-bold">
                  ⚠️ El prefijo debe tener exactamente 3 letras mayúsculas (ej. USH)
                </span>
              ) : !batchValidation.isRangeValid ? (
                <span className="text-red-400 font-bold">
                  ⚠️ Rango inválido (verificá Desde ≤ Hasta, máx. 500 códigos)
                </span>
              ) : batchValidation.duplicateCodes.length > 0 ? (
                <span className="text-red-400 font-bold">
                  ❌ Conflicto: {batchValidation.duplicateCodes.length} código(s) ya existen en la base (
                  {batchValidation.duplicateCodes.slice(0, 3).join(', ')}
                  {batchValidation.duplicateCodes.length > 3 ? '...' : ''})
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">
                  ✅ Verificado en Base de Datos: {batchValidation.requestedCodes.length} códigos libres sin duplicados
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Barra de Pestañas + Buscador */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase transition ${
                tab === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🟢 Activos ({activeTags.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('unclaimed')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase transition ${
                tab === 'unclaimed'
                  ? 'bg-[#ff5500] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🟠 No Activos ({unclaimedTags.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase transition ${
                tab === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({tags.length})
            </button>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código (USH-0001), lote, nombre de piloto o patente..."
            className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs text-white"
          />
        </section>

        {/* Listado de Códigos QR según pestaña */}
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400">
            Cargando listado de QRs desde Supabase...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-10 text-center space-y-2">
            <p className="text-base font-bold text-white">
              No hay códigos QR en esta vista ({tab === 'active' ? 'Activos' : 'No Activos'}).
            </p>
            <p className="text-xs text-slate-400">
              Cambia de pestaña arriba o activa uno de los códigos vírgenes escaneándolo.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map((item) => {
              const targetUrl = `${baseUrl}${item.code}`;
              const qrPreviewUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=${eccLevel}&margin=1&format=svg&data=${encodeURIComponent(
                targetUrl
              )}`;
              const isAct = item.status === 'active';

              const qr3dParams = {
                text: targetUrl,
                codeName: item.code,
                size: qrSize,
                quietZone,
                fillExtrude,
                codeExtrude,
                errorCorrection: eccLevel,
                baseShape,
                moduleStyle,
              };

              return (
                <div
                  key={item.code}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3.5 ${
                    isAct
                      ? 'bg-[#131b2e] border-emerald-500/40'
                      : 'bg-[#131b2e]/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-white">
                          {item.code}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            isAct
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}
                        >
                          {isAct ? '● ACTIVO' : '○ NO ACTIVO'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 break-all">{targetUrl}</p>
                      <p className="text-[10px] font-bold text-orange-300/90">
                        {baseShape === 'round'
                          ? '⚪ Formato 3D: Medallón Redondo'
                          : baseShape === 'round_keychain'
                          ? '🔘 Formato 3D: Redondo + Ojal Llavero'
                          : '⬛ Formato 3D: Cuadrado'}
                      </p>
                    </div>

                    {/* Vista previa visual del QR adaptada a Redondo o Cuadrado */}
                    <div className="relative flex flex-col items-center shrink-0">
                      {baseShape === 'round_keychain' && (
                        <div className="w-3.5 h-3.5 -mb-1.5 rounded-full border-2 border-white bg-slate-900 z-10" />
                      )}
                      <div
                        className={`bg-white flex items-center justify-center shrink-0 ${
                          isRoundShape
                            ? 'w-20 h-20 rounded-full p-3.5 ring-2 ring-slate-900 shadow-md'
                            : 'p-1.5 rounded-xl'
                        }`}
                      >
                        <img
                          src={qrPreviewUrl}
                          alt={item.code}
                          className={isRoundShape ? 'w-12 h-12' : 'w-16 h-16'}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Si está activo, mostrar resumen del piloto y moto */}
                  {isAct && item.profile ? (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        {item.profile.rider_photo_url ? (
                          <img
                            src={item.profile.rider_photo_url}
                            alt={item.profile.full_name}
                            className="h-10 w-10 rounded-xl object-cover border border-orange-500"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
                            🪖
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-white truncate">{item.profile.full_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Sangre:{' '}
                            <strong className="text-red-400">{item.profile.blood_type}</strong> ·
                            Tel: {item.profile.emergency_contact_1_phone}
                          </p>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                        <span className="truncate">{item.profile.bike_brand_model}</span>
                        <span className="font-mono font-bold text-orange-300 ml-2">
                          {item.profile.bike_plate}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400">
                      Código virgen ({item.batch_name}). Listo para laminar en 3D y empaquetar en
                      blíster.
                    </div>
                  )}

                  {/* Botones de Descarga 3D Directa (.3MF Bicolor / .STL / MakerWorld) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadQr3mf(qr3dParams)}
                      className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider shadow"
                    >
                      📦 .3MF {isRoundShape ? 'Redondo' : 'Cuadrado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadQrStl(qr3dParams)}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-[11px] uppercase border border-slate-700"
                    >
                      🧱 .STL {isRoundShape ? 'Redondo' : '3D'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/q/${item.code}`}
                      className="flex-1 text-center py-2 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-xs font-black text-white"
                    >
                      {isAct ? 'Ver Ficha SOS' : 'Abrir QR'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenMakerWorld(item.code)}
                      title="Copia la URL de este QR y abre MakerWorld Parametric Maker"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-orange-300 border border-orange-500/30"
                    >
                      🔗 MakerWorld
                    </button>
                    {isAct && (
                      <button
                        type="button"
                        onClick={() => handleResetQr(item.code)}
                        title="Liberar y volver a estado virgen"
                        className="px-2.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-[11px] font-bold text-red-300 border border-red-500/30"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
