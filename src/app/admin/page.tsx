'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RiderProfile } from '@/lib/types';
import { downloadQr3mf, downloadQrStl } from '@/lib/qr3d';

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

  // Parámetros 3D (Idénticos al script QR.scad de MakerWorld)
  const [qrSize, setQrSize] = useState(50);
  const [quietZone, setQuietZone] = useState(2);
  const [fillExtrude, setFillExtrude] = useState(1.0);
  const [codeExtrude, setCodeExtrude] = useState(0.6);
  const [eccLevel, setEccLevel] = useState<'L' | 'M' | 'Q' | 'H'>('L');

  // Generador de nuevos lotes en Supabase
  const [batchPrefix, setBatchPrefix] = useState('USH');
  const [batchStart, setBatchStart] = useState(51);
  const [batchEnd, setBatchEnd] = useState(100);
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

  // Crear nuevo lote de QRs vírgenes en Supabase
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setCreatingBatch(true);
    setAdminMsg('');

    const { data, error } = await supabase.rpc('generate_qr_batch', {
      prefix: batchPrefix.trim().toUpperCase(),
      start_num: batchStart,
      end_num: batchEnd,
      batch: batchName.trim().toUpperCase(),
    });

    setCreatingBatch(false);
    if (error) {
      setAdminMsg(`⚠️ Error al crear lote: ${error.message}`);
    } else {
      setAdminMsg(`✅ Se generaron ${data || batchEnd - batchStart + 1} códigos QR nuevos.`);
      fetchAllData();
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

        {/* CONFIGURADOR 3D INTEGRADO (Mismos parámetros que tu modelo de MakerWorld) */}
        <section className="bg-[#131b2e] border border-orange-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-400">
                🖨️ Parámetros de Generación 3D Directa (Réplica Exacta MakerWorld QR.scad)
              </h2>
              <p className="text-[11px] text-slate-400">
                Al tocar <strong>«.3MF Bicolor»</strong> o <strong>«.STL»</strong> en cualquier QR
                de abajo, se genera el modelo 3D listo para abrir e imprimir en Bambu Studio sin
                tener que cargar nada a mano.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                SIZE (Tamaño QR mm)
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
            placeholder="Buscar por código (USH-0001), nombre de piloto o patente..."
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
                    </div>

                    <div className="bg-white p-1.5 rounded-xl shrink-0">
                      <img
                        src={qrPreviewUrl}
                        alt={item.code}
                        className="w-16 h-16"
                        loading="lazy"
                      />
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
                      📦 Bajar .3MF (2 Colores)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadQrStl(qr3dParams)}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-[11px] uppercase border border-slate-700"
                    >
                      🧱 Bajar .STL 3D
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

        {/* Generador de Nuevos Lotes en Base de Datos */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-orange-400">
            ➕ Crear Nuevo Lote de Códigos QR Vírgenes en Base de Datos
          </h2>
          <form
            onSubmit={handleCreateBatch}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Prefijo</label>
              <input
                type="text"
                required
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Desde Nº</label>
              <input
                type="number"
                required
                min={1}
                value={batchStart}
                onChange={(e) => setBatchStart(parseInt(e.target.value || '1', 10))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Hasta Nº</label>
              <input
                type="number"
                required
                min={1}
                value={batchEnd}
                onChange={(e) => setBatchEnd(parseInt(e.target.value || '50', 10))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nombre del Lote
              </label>
              <input
                type="text"
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value.toUpperCase())}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white"
              />
            </div>
            <button
              type="submit"
              disabled={creatingBatch}
              className="py-2.5 px-4 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider"
            >
              {creatingBatch ? 'Creando...' : 'Generar Lote'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
