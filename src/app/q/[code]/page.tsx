'use client';

import React, { useState, useEffect, use } from 'react';
import { TRANSLATIONS, Lang } from '@/lib/i18n';
import { RiderProfile, BloodType } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://resq-qr.vercel.app';

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
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showExtraContacts, setShowExtraContacts] = useState(false);
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState(false);
  const [activationNotice, setActivationNotice] = useState('');

  // Modal Soy el Piloto (Login vs Recuperar Clave)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');

  // Estado de Geolocalización para Socorrista y Destinatario seleccionado
  const [selectedContactIdx, setSelectedContactIdx] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [coordsText, setCoordsText] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  const t = TRANSLATIONS[lang];

  // Guardar ficha directamente en Supabase con mapeo explícito de columnas
  const saveProfileToDatabase = async (
    prof: RiderProfile
  ): Promise<{ ok: boolean; error?: string }> => {
    // 1. Asegurar que el código exista en qr_tags y pasarlo a 'active'
    const { data: existingTag } = await supabase
      .from('qr_tags')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (!existingTag) {
      await supabase.from('qr_tags').insert({
        code,
        batch_name: 'PROTOTIPO-01',
        status: 'active',
        claimed_at: new Date().toISOString(),
      });
    } else {
      const { error: tagUpdateErr } = await supabase
        .from('qr_tags')
        .update({
          status: 'active',
          claimed_at: new Date().toISOString(),
        })
        .eq('code', code);

      if (tagUpdateErr) {
        return { ok: false, error: `Error al activar tag QR: ${tagUpdateErr.message}` };
      }
    }

    // 2. Empaquetar campos extra también en JSON de respaldo
    const extraJson = JSON.stringify({
      observations: prof.observations || '',
      emergency_contact_3_name: prof.emergency_contact_3_name || '',
      emergency_contact_3_relation: prof.emergency_contact_3_relation || '',
      emergency_contact_3_phone: prof.emergency_contact_3_phone || '',
      owner_email: prof.owner_email || '',
    });

    // 3. Construir objeto únicamente con las columnas válidas de la tabla rider_profiles
    const dbRow = {
      qr_code: code,
      owner_id: null,
      owner_email: prof.owner_email || null,
      full_name: prof.full_name,
      nationality: prof.nationality || 'AR',
      rider_photo_url: prof.rider_photo_url || null,
      blood_type: prof.blood_type || 'O+',
      has_medical_condition: Boolean(
        prof.allergies || prof.medical_conditions || prof.medications
      ),
      allergies: prof.allergies || null,
      medical_conditions: prof.medical_conditions || null,
      medications: prof.medications || null,
      health_insurance: prof.health_insurance || null,
      health_insurance_number: prof.health_insurance_number || null,
      observations: prof.observations || null,
      medical_notes_pt: extraJson,
      emergency_contact_1_name: prof.emergency_contact_1_name,
      emergency_contact_1_relation: prof.emergency_contact_1_relation,
      emergency_contact_1_phone: prof.emergency_contact_1_phone,
      emergency_contact_2_name: prof.emergency_contact_2_name || null,
      emergency_contact_2_relation: prof.emergency_contact_2_relation || null,
      emergency_contact_2_phone: prof.emergency_contact_2_phone || null,
      emergency_contact_3_name: prof.emergency_contact_3_name || null,
      emergency_contact_3_relation: prof.emergency_contact_3_relation || null,
      emergency_contact_3_phone: prof.emergency_contact_3_phone || null,
      bike_brand_model: prof.bike_brand_model,
      bike_plate: prof.bike_plate,
      bike_photo_url: prof.bike_photo_url || null,
      bike_insurance_company: prof.bike_insurance_company || null,
      bike_insurance_policy: prof.bike_insurance_policy || null,
      bike_insurance_phone: prof.bike_insurance_phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from('rider_profiles')
      .upsert(dbRow, { onConflict: 'qr_code' });

    if (upsertErr) {
      return { ok: false, error: upsertErr.message };
    }

    return { ok: true };
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('verified') === '1') {
        setEmailVerifiedBanner(true);
      }
      // Limpiar cualquier caché viejo de pruebas anteriores en este navegador
      localStorage.removeItem(`resq_profile_${code}`);
    }
  }, [code]);

  // Cargar datos del QR EXCLUSIVAMENTE desde Supabase (única fuente de verdad compartida con /admin)
  useEffect(() => {
    async function loadQrProfile() {
      setLoading(true);

      const { data: riderData } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('qr_code', code)
        .maybeSingle();

      if (riderData && riderData.full_name) {
        let extraMeta: Partial<RiderProfile> = {};
        if (riderData.medical_notes_pt && riderData.medical_notes_pt.startsWith('{')) {
          try {
            extraMeta = JSON.parse(riderData.medical_notes_pt);
          } catch {
            // Ignorar
          }
        }

        const merged: RiderProfile = {
          ...riderData,
          observations: riderData.observations || extraMeta.observations || '',
          emergency_contact_3_name:
            riderData.emergency_contact_3_name || extraMeta.emergency_contact_3_name || '',
          emergency_contact_3_relation:
            riderData.emergency_contact_3_relation ||
            extraMeta.emergency_contact_3_relation ||
            '',
          emergency_contact_3_phone:
            riderData.emergency_contact_3_phone || extraMeta.emergency_contact_3_phone || '',
          owner_email: riderData.owner_email || extraMeta.owner_email || '',
          status: 'active',
        };
        setProfile(merged);
        if (merged.emergency_contact_2_name || merged.emergency_contact_3_name) {
          setShowExtraContacts(true);
        }
        setLoading(false);
        return;
      }

      // Si no hay perfil en rider_profiles, el QR está virgen (unclaimed) y listo para dar de alta
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
    }

    loadQrProfile();
  }, [code]);

  // Compresión liviana de foto (tanto para Foto del Piloto como para Foto de la Moto)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'rider_photo_url' | 'bike_photo_url',
    maxWidth: number
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setProfile((prev) => (prev ? { ...prev, [field]: compressedDataUrl } : prev));
        }
      };
      if (typeof ev.target?.result === 'string') {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Normaliza números telefónicos para WhatsApp (agrega 549 si es número argentino local sin prefijo)
  const formatPhoneForWhatsApp = (rawPhone: string): string => {
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    // Si cargó 10 dígitos típicos de Argentina (ej. 2901508099) sin código de país, anteponer 549
    if (digits.length === 10 && !digits.startsWith('54')) {
      digits = `549${digits}`;
    } else if (digits.length === 12 && digits.startsWith('54') && !digits.startsWith('549')) {
      digits = `549${digits.slice(2)}`;
    }
    return digits;
  };

  // Función para capturar ubicación GPS del socorrista y enviar por WhatsApp o SMS al contacto elegido
  const handleSendLocation = (
    channel: 'whatsapp' | 'sms',
    customContact?: { name: string; relation: string; phone: string }
  ) => {
    if (!profile) return;

    const chosen = customContact || {
      name: profile.emergency_contact_1_name,
      relation: profile.emergency_contact_1_relation,
      phone: profile.emergency_contact_1_phone,
    };

    const rawPhone = chosen.phone || profile.emergency_contact_1_phone;
    const cleanPhone = rawPhone.replace(/[^+\d]/g, '');
    const waPhone = formatPhoneForWhatsApp(rawPhone);
    const profileUrl = `${SITE_URL}/q/${encodeURIComponent(profile.qr_code)}`;

    const triggerMessage = (url: string | null, coords: string | null) => {
      const msg = t.whatsappSosTemplate({
        riderName: profile.full_name,
        contactName: chosen.name,
        contactRelation: chosen.relation,
        code: profile.qr_code,
        bikeModel: profile.bike_brand_model,
        bikePlate: profile.bike_plate,
        bloodType: profile.blood_type,
        mapsUrl: url,
        coords,
        profileUrl,
      });

      if (channel === 'whatsapp') {
        const targetWaUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(
          msg
        )}`;
        window.location.href = targetWaUrl;
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
      triggerMessage(null, null);
      return;
    }

    setGpsStatus('loading');

    const onSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const accuracy = Math.round(pos.coords.accuracy);
      const cText = `${lat}, ${lng} (±${accuracy}m)`;
      const mUrl = `https://maps.google.com/?q=${lat},${lng}`;
      setCoordsText(cText);
      setMapsUrl(mUrl);
      setGpsStatus('ready');
      triggerMessage(mUrl, cText);
    };

    // Intento 1: Alta precisión GPS; si falla o demora en iOS/Android, reintento rápido por antena/Wi-Fi
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => {
            setGpsStatus('error');
            triggerMessage(null, null);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  // Guardar activación o edición del perfil en Supabase
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setAuthError('');

    const updatedProfile: RiderProfile = {
      ...profile,
      owner_email: email ? email.toLowerCase().trim() : profile.owner_email,
      status: 'active',
    };

    if (email) {
      localStorage.setItem(`resq_owner_${code}`, email.toLowerCase().trim());
    }

    // 1. Primero guardar la ficha y activar el QR en Supabase
    const syncRes = await saveProfileToDatabase(updatedProfile);
    if (!syncRes.ok) {
      setAuthError(`Error al guardar en la base de datos: ${syncRes.error}`);
      setSaving(false);
      return;
    }

    // 2. Registrar o autenticar el correo del piloto en Supabase Auth
    if (email && password) {
      try {
        const redirectUrl = `${SITE_URL}/q/${encodeURIComponent(code)}?verified=1`;
        const { data: signUpData } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (!signUpData?.session) {
          setActivationNotice(
            '✅ ¡Tu llavero QR ya quedó ACTIVO en el sistema! Si es tu primera vez, te enviamos un correo de bienvenida.'
          );
        }
      } catch {
        // El QR ya quedó activo en la base de datos
      }
    }

    setProfile(updatedProfile);
    setIsEditing(false);
    setShowLoginModal(false);
    setSaving(false);
  };

  // Verificar login del piloto para editar un QR ya activado
  const handlePilotLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const savedOwner = localStorage.getItem(`resq_owner_${code}`);
      const matchesEmail =
        (profile?.owner_email &&
          profile.owner_email.toLowerCase() === email.toLowerCase().trim()) ||
        (savedOwner && savedOwner === email.toLowerCase().trim());

      if (!matchesEmail) {
        setAuthError('Credenciales inválidas. Verifica el correo con el que activaste este QR.');
        return;
      }
    }

    setShowLoginModal(false);
    setIsEditing(true);
  };

  // Recuperar contraseña por correo electrónico
  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setRecoverSuccess('');

    if (!email.trim()) {
      setAuthError('Ingresa tu correo electrónico para recuperar tu clave.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${SITE_URL}/reset-password?code=${encodeURIComponent(code)}`,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }

    setRecoverSuccess(
      `¡Listo! Enviamos un enlace a ${email.trim()} para que restablezcas tu contraseña.`
    );
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

  const contactsList = [
    {
      name: profile.emergency_contact_1_name,
      relation: profile.emergency_contact_1_relation,
      phone: profile.emergency_contact_1_phone,
      primary: true,
    },
    {
      name: profile.emergency_contact_2_name,
      relation: profile.emergency_contact_2_relation,
      phone: profile.emergency_contact_2_phone,
      primary: false,
    },
    {
      name: profile.emergency_contact_3_name,
      relation: profile.emergency_contact_3_relation,
      phone: profile.emergency_contact_3_phone,
      primary: false,
    },
  ].filter((c) => Boolean(c.name && c.phone));

  // ============================================================================
  // VISTA 1: QR VIRGEN (RECIÉN SALIDO DEL BLÍSTER) O MODO EDICIÓN DEL PILOTO
  // ============================================================================
  if (profile.status === 'unclaimed' || isEditing) {
    return (
      <main className="min-h-screen bg-[#0b0f17] text-slate-100 pb-16">
        <header className="border-b border-slate-800 bg-[#111827] px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold tracking-widest text-[#ff5500] uppercase">
                EXPEDITION SAFETY &amp; MEDICAL SOS SYSTEM • USHUAIA
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
              {profile.status === 'unclaimed'
                ? 'QR Virgen · Activación Libre'
                : 'Modo Edición del Piloto'}
            </span>
            <h2 className="text-xl font-extrabold text-white">
              {profile.status === 'unclaimed'
                ? t.unclaimedTitle
                : 'Actualizar Ficha Médica y Vehículo'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {profile.status === 'unclaimed'
                ? t.unclaimedSubtitle
                : 'Modifica tus datos médicos, fotos, contactos de emergencia o seguro.'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 rounded-xl bg-red-950/80 border border-red-500 p-3 text-xs font-bold text-red-200">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
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
                  🔒 Este QR quedará bloqueado a tu cuenta. Recibirás un correo para verificar tu
                  dirección.
                </p>
              </section>
            )}

            {/* Paso 2: Foto del Piloto, Datos y Condición Médica */}
            <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                {t.claimStepMedical}
              </h3>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-4">
                <div className="shrink-0">
                  {profile.rider_photo_url ? (
                    <img
                      src={profile.rider_photo_url}
                      alt="Foto del piloto"
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-orange-500"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-2xl">
                      🧑
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-bold text-white">
                    📸 Foto del Piloto (Visible arriba en la ficha)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Sube una foto de tu rostro sin casco para rápida identificación médica.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'rider_photo_url', 450)}
                    className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-[#ff5500] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-orange-600"
                  />
                </div>
              </div>

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
                    Obra Social / Seguro Médico
                  </label>
                  <input
                    type="text"
                    value={profile.health_insurance || ''}
                    onChange={(e) => setProfile({ ...profile, health_insurance: e.target.value })}
                    placeholder="Ej: OSDE 310 / Assist Card"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nº de Obra Social / Afiliado
                  </label>
                  <input
                    type="text"
                    value={profile.health_insurance_number || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, health_insurance_number: e.target.value })
                    }
                    placeholder="Ej: 61-0492817-01"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>
              </div>

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
                      has_medical_condition: Boolean(
                        e.target.value || profile.medical_conditions
                      ),
                    })
                  }
                  placeholder="Ej: Penicilina, Ibuprofeno, Látex, Ninguna"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                />
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

              <div>
                <label className="block text-xs font-semibold text-orange-300 mb-1">
                  📝 Observaciones / Indicaciones Especiales
                </label>
                <textarea
                  rows={2}
                  value={profile.observations || ''}
                  onChange={(e) => setProfile({ ...profile, observations: e.target.value })}
                  placeholder="Ej: Casco rebatible, medicación en maleta izquierda, viajo en grupo hacia Ushuaia..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                />
              </div>
            </section>

            {/* Paso 3: Hasta 3 Contactos de Emergencia y Vehículo */}
            <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                {t.claimStepVehicle}
              </h3>

              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-400">
                  Contacto de Emergencia 1 (Principal - Familiar o Allegado) *
                </p>
                <p className="text-[11px] text-slate-400">
                  ⚠️ Ingresa el celular de la persona a quien deben avisar si tienes un accidente (no pongas tu propio número, o WhatsApp abrirá tu propio chat).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={profile.emergency_contact_1_name}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_name: e.target.value })
                    }
                    placeholder="Nombre y Apellido *"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    required
                    value={profile.emergency_contact_1_relation}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_relation: e.target.value })
                    }
                    placeholder="Vínculo (Esposa, Padre) *"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="tel"
                    required
                    value={profile.emergency_contact_1_phone}
                    onChange={(e) =>
                      setProfile({ ...profile, emergency_contact_1_phone: e.target.value })
                    }
                    placeholder="+5492901654321 *"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {!showExtraContacts ? (
                <button
                  type="button"
                  onClick={() => setShowExtraContacts(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-dashed border-orange-500/50 text-xs font-bold text-orange-400 transition"
                >
                  + Agregar 2º y 3º Contacto de Emergencia (Opcional)
                </button>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-300">
                      Contacto de Emergencia 2 (Opcional)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={profile.emergency_contact_2_name || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_2_name: e.target.value })
                        }
                        placeholder="Nombre y Apellido"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                      <input
                        type="text"
                        value={profile.emergency_contact_2_relation || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_2_relation: e.target.value })
                        }
                        placeholder="Vínculo (Hermano, Amigo)"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                      <input
                        type="tel"
                        value={profile.emergency_contact_2_phone || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_2_phone: e.target.value })
                        }
                        placeholder="+549..."
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-300">
                      Contacto de Emergencia 3 (Opcional)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={profile.emergency_contact_3_name || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_3_name: e.target.value })
                        }
                        placeholder="Nombre y Apellido"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                      <input
                        type="text"
                        value={profile.emergency_contact_3_relation || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_3_relation: e.target.value })
                        }
                        placeholder="Vínculo (Compañero ruta)"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                      <input
                        type="tel"
                        value={profile.emergency_contact_3_phone || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, emergency_contact_3_phone: e.target.value })
                        }
                        placeholder="+549..."
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    Tel. Grúa / Auxilio
                  </label>
                  <input
                    type="tel"
                    value={profile.bike_insurance_phone || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, bike_insurance_phone: e.target.value })
                    }
                    placeholder="Ej: 08002220022"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-white">
                  🏍️ Foto de tu Moto (Subir desde tu galería o tomar foto)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'bike_photo_url', 800)}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-[#ff5500] file:px-3.5 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-orange-600"
                />
                {profile.bike_photo_url && (
                  <div className="relative mt-2">
                    <img
                      src={profile.bike_photo_url}
                      alt="Vista previa moto"
                      className="h-36 w-full object-cover rounded-xl border border-slate-700"
                    />
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-[#ff5500] hover:bg-orange-600 disabled:opacity-50 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
            >
              {saving ? 'Guardando Ficha ResQ en el Servidor...' : t.activateQrBtn}
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

      <div className="bg-red-600 text-white text-center py-1.5 px-3 text-xs font-black tracking-widest uppercase">
        🚨 {t.sosBanner} · « Escaneá. Asistí. Rescatá. »
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {emailVerifiedBanner && (
          <div className="bg-emerald-950/90 border border-emerald-500 rounded-xl p-3 text-xs font-bold text-emerald-200 text-center">
            ✅ ¡Tu correo electrónico fue confirmado con éxito! Tu llavero QR ResQ está verificado.
          </div>
        )}

        {activationNotice && (
          <div className="bg-orange-950/90 border border-orange-500 rounded-xl p-3 text-xs font-bold text-orange-200 text-center">
            📩 {activationNotice}
          </div>
        )}

        {/* a) FOTO DEL PILOTO ARRIBA VISIBLE + IDENTIDAD + b) GRUPO SANGUÍNEO */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {profile.rider_photo_url ? (
              <img
                src={profile.rider_photo_url}
                alt={profile.full_name}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-[#ff5500] shrink-0 shadow-md"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                🪖
              </div>
            )}
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded mb-1">
                ● {t.verifiedTag}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">
                {profile.full_name}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                País: <strong className="text-slate-200">{profile.nationality}</strong>
                {profile.doc_last_digits && <span> · Doc: ***{profile.doc_last_digits}</span>}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-center bg-red-600/20 border-2 border-red-500 rounded-2xl px-3.5 py-2.5">
            <span className="block text-[8px] font-extrabold uppercase tracking-wider text-red-300">
              {t.bloodType}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white">{profile.blood_type}</span>
          </div>
        </section>

        {/* c) ENVIAR UBICACIÓN DE EMERGENCIA AL CONTACTO (WhatsApp + SMS 2G) */}
        {(() => {
          const activeRecipient = contactsList[selectedContactIdx] ||
            contactsList[0] || {
              name: profile.emergency_contact_1_name || 'Contacto de Emergencia',
              relation: profile.emergency_contact_1_relation || '',
              phone: profile.emergency_contact_1_phone || '',
            };

          return (
            <section className="bg-gradient-to-br from-orange-600/25 to-red-600/20 border-2 border-[#ff5500] rounded-2xl p-4 space-y-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  📍 {t.sendGpsTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">{t.sendGpsSubtitle}</p>
              </div>

              {/* Caja explícita mostrando A QUIÉN se le envía el mensaje */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">
                    🎯 {t.recipientLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">
                    {activeRecipient.phone}
                  </span>
                </div>
                <p className="text-sm font-black text-white">
                  {activeRecipient.name}{' '}
                  {activeRecipient.relation && (
                    <span className="text-xs font-semibold text-orange-300">
                      ({activeRecipient.relation})
                    </span>
                  )}
                </p>

                {contactsList.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {contactsList.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedContactIdx(i)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                          selectedContactIdx === i
                            ? 'bg-[#ff5500] text-white border-orange-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        #{i + 1} {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSendLocation('whatsapp', {
                    name: activeRecipient.name || '',
                    relation: activeRecipient.relation || '',
                    phone: activeRecipient.phone || '',
                  })
                }
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition text-center"
              >
                <span>
                  📲 {t.btnGetGpsWhatsapp} {activeRecipient.name}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendLocation('sms', {
                    name: activeRecipient.name || '',
                    relation: activeRecipient.relation || '',
                    phone: activeRecipient.phone || '',
                  })
                }
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition text-center"
              >
                <span>
                  ✉️ {t.btnGetGpsSms} {activeRecipient.name}
                </span>
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
              {gpsStatus === 'error' && (
                <div className="bg-amber-950/70 border border-amber-500/40 rounded-xl p-2.5 text-center">
                  <p className="text-[11px] font-semibold text-amber-200">⚠️ {t.gpsError}</p>
                </div>
              )}
            </section>
          );
        })()}

        {/* d) CONTACTOS DE EMERGENCIA DEL PILOTO (Hasta 3 contactos) */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            📞 {t.emergencyContacts} ({contactsList.length})
          </h2>

          <div className="space-y-2.5">
            {contactsList.map((contact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                      #{idx + 1}
                    </span>
                    <p className="text-base font-extrabold text-white truncate">{contact.name}</p>
                  </div>
                  <p className="text-xs text-orange-400 font-semibold mt-0.5">
                    {contact.relation} · {contact.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendLocation('whatsapp', {
                        name: contact.name || '',
                        relation: contact.relation || '',
                        phone: contact.phone || '',
                      })
                    }
                    title="Enviar GPS por WhatsApp a este contacto"
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs px-2.5 py-3 rounded-xl"
                  >
                    📍WA
                  </button>
                  <a
                    href={`tel:${contact.phone}`}
                    className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider px-3.5 py-3 rounded-xl shadow-md shadow-red-900/40"
                  >
                    📞 {t.callNow}
                  </a>
                </div>
              </div>
            ))}
          </div>

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

        {/* b) CONDICIÓN MÉDICA + OBRA SOCIAL + OBSERVACIONES */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            ⚕️ {t.medicalAlert}
          </h2>

          {!profile.allergies &&
          !profile.medical_conditions &&
          !profile.medications &&
          !profile.observations ? (
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

              {profile.observations && (
                <div className="bg-orange-950/30 border border-orange-500/40 rounded-xl p-3">
                  <span className="block text-[10px] font-extrabold uppercase text-orange-300">
                    📝 {t.observations}
                  </span>
                  <p className="text-slate-100 mt-0.5">{profile.observations}</p>
                </div>
              )}
            </div>
          )}

          {(profile.health_insurance || profile.health_insurance_number) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  {t.healthInsurance}
                </span>
                <strong className="text-white text-sm">{profile.health_insurance || '—'}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  {t.healthInsuranceNumber}
                </span>
                <strong className="text-orange-300 font-mono text-sm">
                  {profile.health_insurance_number || '—'}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* e) DATOS DEL VEHÍCULO (MOTO, FOTO, PATENTE, SEGURO) */}
        <section className="bg-[#131b2e] border border-slate-800 rounded-2xl overflow-hidden">
          {profile.bike_photo_url && (
            <div className="relative h-48 w-full bg-slate-950">
              <img
                src={profile.bike_photo_url}
                alt={profile.bike_brand_model}
                fetchPriority="low"
                loading="lazy"
                className="h-full w-full object-cover opacity-95"
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

        <footer className="pt-2 text-center space-y-3">
          <p className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            🛡️ {t.privacyNotice}
          </p>

          <button
            type="button"
            onClick={() => {
              setModalMode('login');
              setAuthError('');
              setRecoverSuccess('');
              setShowLoginModal(true);
            }}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 underline underline-offset-4"
          >
            🔐 {t.riderLoginBtn}
          </button>
        </footer>
      </div>

      {/* Modal Soy el Piloto: Ingresar o Recuperar Contraseña */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {modalMode === 'login'
                  ? `🔐 Acceso del Piloto (${code})`
                  : '🔑 Recuperar Contraseña'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setModalMode('login');
                  setAuthError('');
                  setRecoverSuccess('');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  modalMode === 'login'
                    ? 'bg-[#ff5500] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode('recover');
                  setAuthError('');
                  setRecoverSuccess('');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  modalMode === 'recover'
                    ? 'bg-[#ff5500] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recuperar Clave
              </button>
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/60 border border-red-500/40 p-2.5 rounded-lg">
                {authError}
              </p>
            )}
            {recoverSuccess && (
              <p className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-lg">
                {recoverSuccess}
              </p>
            )}

            {modalMode === 'login' ? (
              <form onSubmit={handlePilotLogin} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Ingresa tu correo y contraseña para editar tu ficha médica o vehículo.
                </p>
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
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Te enviaremos un correo con un enlace seguro para que elijas una nueva contraseña.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico registrado"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider"
                >
                  Enviar Enlace de Recuperación
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
