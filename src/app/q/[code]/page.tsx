'use client';

import React, { useState, useEffect, use } from 'react';
import { TRANSLATIONS, Lang } from '@/lib/i18n';
import { DEMO_PROFILES, RiderProfile, BloodType } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function QrEmergencyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = decodeURIComponent(resolvedParams.code).toUpperCase();

  const [lang, setLang] = useState<Lang>('es');
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Estado de login para edición
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Estado de Geolocalización para Socorrista
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [coordsText, setCoordsText] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  const t = TRANSLATIONS[lang];

  // Cargar datos del QR (desde Supabase o LocalStorage/Demo)
  useEffect(() => {
    async function loadQrProfile() {
      setLoading(true);

      // 1. Intentar desde LocalStorage si el usuario ya editó en modo demo
      const savedLocal = localStorage.getItem(`resq_profile_${code}`);
      if (savedLocal) {
        setProfile(JSON.parse(savedLocal));
        setLoading(false);
        return;
      }

      // 2. Si Supabase está configurado, consultar en tiempo real
      if (isSupabaseConfigured && supabase) {
        const { data: tagData } = await supabase
          .from('qr_tags')
          .select('code, status')
          .eq('code', code)
          .single();

        if (tagData && tagData.status === 'unclaimed') {
          setProfile({
            qr_code: code,
            status: 'unclaimed',
            full_name: '',
            nationality: 'AR',
            blood_type: 'O+',
            has_medical_condition: false,
            emergency_contact_1_name: '',
            emergency_contact_1_relation: '',
            emergency_contact_1_phone: '',
            bike_brand_model: '',
            bike_plate: '',
          });
          setLoading(false);
          return;
        }

        const { data: riderData } = await supabase
          .from('rider_profiles')
          .select('*')
          .eq('qr_code', code)
          .single();

        if (riderData) {
          setProfile({ ...riderData, status: tagData?.status || 'active' });
          setLoading(false);
          return;
        }
      }

      // 3. Fallback a perfiles Demo (USH-0001 activo, cualquier otro nuevo como virgen de blíster)
      const fallback = DEMO_PROFILES[code] || {
        qr_code: code,
        status: 'unclaimed',
        full_name: '',
        nationality: 'AR',
        blood_type: 'O+',
        has_medical_condition: false,
        emergency_contact_1_name: '',
        emergency_contact_1_relation: '',
        emergency_contact_1_phone: '',
        bike_brand_model: '',
        bike_plate: '',
      };
      setProfile(fallback);
      setLoading(false);
    }

    loadQrProfile();
  }, [code]);

  // Función para capturar ubicación GPS del socorrista y enviar por WhatsApp o SMS
  const handleSendLocation = (channel: 'whatsapp' | 'sms') => {
    if (!profile) return;
    const cleanPhone = profile.emergency_contact_1_phone.replace(/[^+\d]/g, '');

    const triggerMessage = (url: string, coords: string) => {
      const msg = t.whatsappSosTemplate(profile.full_name, profile.qr_code, url, coords);
      if (channel === 'whatsapp') {
        const waPhone = cleanPhone.replace(/^\+/, '');
        window.open(
          `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
      }
    };

    if (gpsStatus === 'ready' && mapsUrl) {
      triggerMessage(mapsUrl, coordsText);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      triggerMessage('Ubicación GPS no disponible en este navegador', 'Sin señal GPS');
      return;
    }

    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const accuracy = Math.round(pos.coords.accuracy);
        const cText = `${lat}, ${lng} (±${accuracy}m)`;
        const mUrl = `https://maps.google.com/?q=${lat},${lng}`;
        setCoordsText(cText);
        setMapsUrl(mUrl);
        setGpsStatus('ready');
        triggerMessage(mUrl, cText);
      },
      () => {
        setGpsStatus('error');
        triggerMessage('Sin lectura GPS (verificar permisos)', 'Llamar al socorrista');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Guardar activación o edición del perfil
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const updatedProfile: RiderProfile = {
      ...profile,
      status: 'active',
    };

    // Guardar en LocalStorage para persistencia inmediata en prototipo
    localStorage.setItem(`resq_profile_${code}`, JSON.stringify(updatedProfile));
    if (email) {
      localStorage.setItem(`resq_owner_${code}`, email.toLowerCase().trim());
    }

    // Si Supabase está activo, guardar en la nube
    if (isSupabaseConfigured && supabase) {
      if (profile.status === 'unclaimed' && email && password) {
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) {
          setAuthError(signUpErr.message);
          return;
        }
        const userId = authData.user?.id;
        if (userId) {
          await supabase
            .from('qr_tags')
            .update({ status: 'active', owner_id: userId, claimed_at: new Date().toISOString() })
            .eq('code', code);

          await supabase.from('rider_profiles').upsert({
            ...updatedProfile,
            owner_id: userId,
          });
        }
      }
    }

    setProfile(updatedProfile);
    setIsEditing(false);
    setShowLoginModal(false);
  };

  // Verificar login del piloto para editar un QR ya activado
  const handlePilotLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError('Credenciales inválidas. Verifica tu email y contraseña.');
        return;
      }
    } else {
      const savedOwner = localStorage.getItem(`resq_owner_${code}`);
      if (savedOwner && savedOwner !== email.toLowerCase().trim()) {
        setAuthError('Este QR fue activado con otro correo electrónico.');
        return;
      }
    }

    setShowLoginModal(false);
    setIsEditing(true);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent mb-3" />
          <p className="text-sm font-bold tracking-widest uppercase text-orange-400">
            ResQ · Cargando Ficha SOS ({code})...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 1: QR VIRGEN (RECIÉN SALIDO DEL BLÍSTER) O MODO EDICIÓN DEL PILOTO
  // ============================================================================
  if (profile.status === 'unclaimed' || isEditing) {
    return (
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 pb-16">
        {/* Cabecera de Marca ResQ */}
        <header className="border-b border-slate-800 bg-[#111827] px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold tracking-widest text-[#ff5500] uppercase">
                EXPEDITION SAFETY & MEDICAL SOS SYSTEM • USHUAIA
              </p>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">ResQ</h1>
                <span className="text-xs font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded">
                  {code}
                </span>
              </div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                Cancelar
              </button>
            )}
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 pt-6">
          <div className="bg-gradient-to-r from-orange-600/20 to-red-600/10 border border-orange-500/40 rounded-2xl p-4 mb-6">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-[#ff5500] text-white px-2.5 py-0.5 rounded mb-2">
              {profile.status === 'unclaimed' ? 'QR Virgen · Activación Libre' : 'Modo Edición del Piloto'}
            </span>
            <h2 className="text-xl font-extrabold text-white">
              {profile.status === 'unclaimed' ? t.unclaimedTitle : 'Actualizar Ficha Médica y Vehículo'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {profile.status === 'unclaimed'
                ? t.unclaimedSubtitle
                : 'Modifica tus datos médicos, contacto de emergencia o seguro. Los cambios se actualizan al instante en tu QR.'}
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Paso 1: Cuenta (solo al activar por primera vez) */}
            {profile.status === 'unclaimed' && (
              <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                  {t.claimStepAccount}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="piloto@email.com"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Crear Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  🔒 Este QR quedará bloqueado a tu cuenta. Nadie más podrá modificarlo sin tu clave.
                </p>
              </section>
            )}

            {/* Paso 2: Datos del Piloto y Condición Médica */}
            <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                {t.claimStepMedical}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    a) Nombre y Apellido Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Ej: Martín Alejandro Gómez"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Grupo Sanguíneo *
                  </label>
                  <select
                    value={profile.blood_type}
                    onChange={(e) =>
                      setProfile({ ...profile, blood_type: e.target.value as BloodType })
                    }
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm font-bold text-red-400"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Desconocido'].map(
                      (bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alergias a Medicamentos / Otros
                  </label>
                  <input
                    type="text"
                    value={profile.allergies || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        allergies: e.target.value,
                        has_medical_condition: Boolean(e.target.value || profile.medical_conditions),
                      })
                    }
                    placeholder="Ej: Penicilina, Ibuprofeno, Ninguna"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Obra Social / Seguro de Viaje
                  </label>
                  <input
                    type="text"
                    value={profile.health_insurance || ''}
                    onChange={(e) => setProfile({ ...profile, health_insurance: e.target.value })}
                    placeholder="Ej: OSDE 310 / Assist Card"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  b) Condición Médica / Patologías / Medicación Habitual
                </label>
                <textarea
                  rows={2}
                  value={profile.medical_conditions || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      medical_conditions: e.target.value,
                      has_medical_condition: Boolean(e.target.value || profile.allergies),
                    })
                  }
                  placeholder="Ej: Diabetes, Hipertensión, Anticoagulantes, Implantes metálicos..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                />
              </div>
            </section>

            {/* Paso 3: Contacto de Emergencia y Vehículo */}
            <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                {t.claimStepVehicle}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    d) Contacto Emergencia *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.emergency_contact_1_name}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_name: e.target.value })
                    }
                    placeholder="Nombre del familiar"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vínculo / Relación *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.emergency_contact_1_relation}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_relation: e.target.value })
                    }
                    placeholder="Ej: Esposa, Padre"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono (con cód. país) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profile.emergency_contact_1_phone}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_phone: e.target.value })
                    }
                    placeholder="+5492901654321"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <hr className="border-slate-800" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    e) Marca y Modelo de la Moto *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.bike_brand_model}
                    onChange={(e) => setProfile({ ...profile, bike_brand_model: e.target.value })}
                    placeholder="Ej: Honda Africa Twin CRF1100L"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Patente / Dominio *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.bike_plate}
                    onChange={(e) =>
                      setProfile({ ...profile, bike_plate: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: A219KLP"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm font-mono uppercase text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Compañía de Seguro
                  </label>
                  <input
                    type="text"
                    value={profile.bike_insurance_company || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, bike_insurance_company: e.target.value })
                    }
                    placeholder="Ej: Federación Patronal"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de Póliza
                  </label>
                  <input
                    type="text"
                    value={profile.bike_insurance_policy || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, bike_insurance_policy: e.target.value })
                    }
                    placeholder="Ej: FP-9948120"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL Foto de la Moto
                  </label>
                  <input
                    type="url"
                    value={profile.bike_photo_url || ''}
                    onChange={(e) => setProfile({ ...profile, bike_photo_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
            >
              {t.activateQrBtn}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ============================================================================
  // VISTA 2: PANTALLA DE EMERGENCIA SOS (SOCORRISTA - CERO FRICCIÓN <1s)
  // ============================================================================
  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 pb-14">
      {/* Barra Superior Multilingüe Instantánea (ES / EN / PT) */}
      <header className="sticky top-0 z-30 bg-[#0b0f17]/95 backdrop-blur border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[9px] font-extrabold tracking-widest text-[#ff5500] uppercase">
              USHUAIA • PATAGONIA
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">ResQ</span>
              <span className="text-[11px] font-mono bg-red-600/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded font-bold">
                {profile.qr_code}
              </span>
            </div>
          </div>

          {/* Selector de Idioma ES / EN / PT */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['es', 'en', 'pt'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase transition ${
                  lang === l
                    ? 'bg-[#ff5500] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Cinta Roja Táctica SOS */}
      <div className="bg-red-600 text-white text-center py-1.5 px-3 text-xs font-black tracking-widest uppercase">
        🚨 {t.sosBanner} · « Escaneá. Asistí. Rescatá. »
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* a) IDENTIDAD DEL PILOTO + b) GRUPO SANGUÍNEO DESTACADO */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded mb-1">
              ● {t.verifiedTag}
            </span>
            <h1 className="text-2xl font-black text-white leading-tight">{profile.full_name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              País: <strong className="text-slate-200">{profile.nationality}</strong>
              {profile.doc_last_digits && (
                <span> · Doc: ***{profile.doc_last_digits}</span>
              )}
            </p>
          </div>

          <div className="shrink-0 text-center bg-red-600/20 border-2 border-red-500 rounded-2xl px-4 py-2.5">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-red-300">
              {t.bloodType}
            </span>
            <span className="text-3xl font-black text-white">{profile.blood_type}</span>
          </div>
        </section>

        {/* c) ENVIAR UBICACIÓN GPS AL CONTACTO DE EMERGENCIA (WhatsApp + SMS 2G) */}
        <section className="bg-gradient-to-br from-orange-600/25 to-red-600/20 border-2 border-[#ff5500] rounded-2xl p-4 space-y-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              📍 {t.sendGpsTitle}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">{t.sendGpsSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => handleSendLocation('whatsapp')}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition"
          >
            <span>📲 {t.btnGetGpsWhatsapp}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendLocation('sms')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <span>✉️ {t.btnGetGpsSms}</span>
          </button>

          {gpsStatus === 'loading' && (
            <p className="text-xs text-amber-300 font-medium text-center animate-pulse">
              🛰️ {t.locatingGps}
            </p>
          )}
          {gpsStatus === 'ready' && coordsText && (
            <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-2.5 text-center">
              <p className="text-[11px] font-bold text-emerald-400">✓ {t.gpsReady}</p>
              <p className="text-xs font-mono text-white mt-0.5">{coordsText}</p>
            </div>
          )}
        </section>

        {/* d) LLAMADA DE EMERGENCIA + CONTACTO DEL PILOTO */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            📞 {t.emergencyContacts}
          </h2>

          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div>
              <p className="text-base font-extrabold text-white">
                {profile.emergency_contact_1_name}
              </p>
              <p className="text-xs text-orange-400 font-semibold">
                {profile.emergency_contact_1_relation} · {profile.emergency_contact_1_phone}
              </p>
            </div>
            <a
              href={`tel:${profile.emergency_contact_1_phone}`}
              className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider px-4 py-3 rounded-xl shadow-md shadow-red-900/40 shrink-0"
            >
              📞 {t.callNow}
            </a>
          </div>

          {profile.emergency_contact_2_name && profile.emergency_contact_2_phone && (
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div>
                <p className="text-sm font-bold text-white">{profile.emergency_contact_2_name}</p>
                <p className="text-xs text-slate-400">
                  {profile.emergency_contact_2_relation} · {profile.emergency_contact_2_phone}
                </p>
              </div>
              <a
                href={`tel:${profile.emergency_contact_2_phone}`}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl border border-slate-700 shrink-0"
              >
                📞 {t.callNow}
              </a>
            </div>
          )}

          {/* Números de Emergencia Locales en Ruta */}
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              🚑 {t.localEmergencyNumbers}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="tel:107"
                className="bg-red-950/60 border border-red-500/40 hover:bg-red-900/50 rounded-xl py-2.5 text-center text-xs font-extrabold text-red-200"
              >
                {t.medical107}
              </a>
              <a
                href="tel:911"
                className="bg-blue-950/60 border border-blue-500/40 hover:bg-blue-900/50 rounded-xl py-2.5 text-center text-xs font-extrabold text-blue-200"
              >
                {t.police911}
              </a>
              <a
                href="tel:103"
                className="bg-orange-950/60 border border-orange-500/40 hover:bg-orange-900/50 rounded-xl py-2.5 text-center text-xs font-extrabold text-orange-200"
              >
                {t.civilDefense103}
              </a>
            </div>
          </div>
        </section>

        {/* b) CONDICIÓN MÉDICA DETALLADA */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            ⚕️ {t.medicalAlert}
          </h2>

          {!profile.allergies && !profile.medical_conditions && !profile.medications ? (
            <p className="text-sm text-slate-300">{t.noKnownConditions}</p>
          ) : (
            <div className="space-y-2.5 text-sm">
              {profile.allergies && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3">
                  <span className="block text-[10px] font-extrabold uppercase text-red-300">
                    ⚠️ {t.allergies}
                  </span>
                  <p className="font-bold text-white mt-0.5">{profile.allergies}</p>
                </div>
              )}

              {profile.medical_conditions && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    {t.conditions}
                  </span>
                  <p className="text-slate-100 mt-0.5">{profile.medical_conditions}</p>
                </div>
              )}

              {profile.medications && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    💊 {t.medications}
                  </span>
                  <p className="text-slate-100 mt-0.5">{profile.medications}</p>
                </div>
              )}
            </div>
          )}

          {profile.health_insurance && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
              <span>{t.healthInsurance}:</span>
              <strong className="text-white">
                {profile.health_insurance}{' '}
                {profile.health_insurance_number && `(${profile.health_insurance_number})`}
              </strong>
            </div>
          )}
        </section>

        {/* e) DATOS DEL VEHÍCULO (MOTO, FOTO, PATENTE, SEGURO) */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl overflow-hidden">
          {profile.bike_photo_url && (
            <div className="relative h-44 w-full bg-slate-950">
              <img
                src={profile.bike_photo_url}
                alt={profile.bike_brand_model}
                fetchPriority="low"
                loading="lazy"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131b2e] via-transparent to-transparent" />
              <span className="absolute bottom-3 left-4 bg-black/80 backdrop-blur border border-white/20 px-3 py-1 rounded-lg font-mono text-sm font-black tracking-widest text-white">
                {profile.hide_plate_publicly ? '***-***' : profile.bike_plate}
              </span>
            </div>
          )}

          <div className="p-4 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              🏍️ {t.vehicleData}
            </h2>
            <div>
              <p className="text-lg font-extrabold text-white">{profile.bike_brand_model}</p>
              <p className="text-xs text-slate-400">
                {profile.bike_year && `${profile.bike_year} · `}
                {profile.bike_color && `${t.color}: ${profile.bike_color} · `}
                {t.plate}:{' '}
                <strong className="font-mono text-white">
                  {profile.hide_plate_publicly ? 'Oculta' : profile.bike_plate}
                </strong>
              </p>
            </div>

            {profile.bike_insurance_company && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    {t.insurance}
                  </span>
                  <p className="text-sm font-bold text-white">{profile.bike_insurance_company}</p>
                  {profile.bike_insurance_policy && (
                    <p className="text-xs text-slate-400">
                      {t.policyNumber}: {profile.bike_insurance_policy}
                    </p>
                  )}
                </div>
                {profile.bike_insurance_phone && (
                  <a
                    href={`tel:${profile.bike_insurance_phone}`}
                    className="bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 font-bold text-xs px-3 py-2 rounded-xl"
                  >
                    🛠️ Grúa
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Nota de Privacidad Antirrobo + Botón de Login del Piloto */}
        <footer className="pt-2 text-center space-y-3">
          <p className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            🛡️ {t.privacyNotice}
          </p>

          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 underline underline-offset-4"
          >
            🔐 {t.riderLoginBtn}
          </button>
        </footer>
      </div>

      {/* Modal de Login del Piloto para Editar Datos */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Acceso del Piloto ({code})</h3>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Ingresa el correo y contraseña con los que activaste tu llavero ResQ para modificar tu
              ficha médica o vehículo.
            </p>
            {authError && (
              <p className="text-xs text-red-400 bg-red-950/60 border border-red-500/40 p-2 rounded-lg">
                {authError}
              </p>
            )}
            <form onSubmit={handlePilotLogin} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo electrónico"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider"
              >
                Ingresar y Editar Ficha
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
