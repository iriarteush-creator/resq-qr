-- ============================================================================
-- ACTUALIZACIÓN V2 ResQ:
-- 1. Nuevos campos: Foto Piloto, Nº Obra Social, Observaciones y 3 Contactos
-- 2. Guardado inmediato al darse de alta (compatible con Confirm Email activo)
-- 3. Funciones para el Panel Administrador (/admin)
-- ============================================================================

-- 1. Agregar columnas nuevas a rider_profiles
alter table public.rider_profiles
  add column if not exists observations text,
  add column if not exists emergency_contact_3_name text,
  add column if not exists emergency_contact_3_relation text,
  add column if not exists emergency_contact_3_phone text,
  add column if not exists owner_email text;

-- Permitir que owner_id sea opcional durante los minutos previos a confirmar el email
alter table public.rider_profiles
  alter column owner_id drop not null;

-- 2. Actualizar políticas RLS para que la activación de un QR virgen funcione
-- inmediatamente aunque el usuario aún no haya hecho clic en el mail de confirmación
drop policy if exists "Reclamar QR virgen en primer escaneo" on public.qr_tags;
create policy "Activar o actualizar QR"
  on public.qr_tags for update
  using (true)
  with check (true);

drop policy if exists "Insertar nuevos QR desde admin" on public.qr_tags;
create policy "Insertar nuevos QR desde admin"
  on public.qr_tags for insert
  with check (true);

drop policy if exists "Piloto crea su propia ficha" on public.rider_profiles;
create policy "Crear ficha de emergencia"
  on public.rider_profiles for insert
  with check (true);

drop policy if exists "Piloto actualiza su propia ficha" on public.rider_profiles;
create policy "Actualizar ficha de emergencia"
  on public.rider_profiles for update
  using (true)
  with check (true);

drop policy if exists "Admin elimina ficha al resetear QR" on public.rider_profiles;
create policy "Admin elimina ficha al resetear QR"
  on public.rider_profiles for delete
  using (true);
