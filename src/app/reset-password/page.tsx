'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [qrCode, setQrCode] = useState('USH-0001');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) setQrCode(codeParam.toUpperCase());
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    if (supabase) {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setMessage('✅ ¡Contraseña actualizada con éxito! Ya puedes volver a tu ficha QR.');
  };

  return (
    <main className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="text-center border-b border-slate-800 pb-4">
          <p className="text-[10px] font-extrabold tracking-widest text-[#ff5500] uppercase">
            USHUAIA • PATAGONIA
          </p>
          <h1 className="text-3xl font-black text-white mt-0.5">ResQ</h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Restablecer Contraseña del Piloto
          </p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500 rounded-xl p-3 text-xs font-bold text-red-200">
            ⚠️ {error}
          </div>
        )}

        {message ? (
          <div className="space-y-4 text-center">
            <div className="bg-emerald-950/80 border border-emerald-500 rounded-xl p-4 text-sm font-bold text-emerald-200">
              {message}
            </div>
            <Link
              href={`/q/${qrCode}`}
              className="block w-full py-3 rounded-xl bg-[#ff5500] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider"
            >
              Ir a mi Ficha QR ({qrCode})
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Nueva Contraseña *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-[#ff5500] hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider"
            >
              {saving ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
