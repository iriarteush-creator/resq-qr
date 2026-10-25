-- ============================================================================
-- MOTO SOS QR (Ushuaia / Patagonia) - Esquema de Base de Datos en Supabase
-- Diseñado para Cero Fricción (<1s en 3G/Edge) y Protección Antirrobo
-- ============================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- 1. TABLA DE LOTES Y CÓDIGOS QR PRE-IMPRESOS (Blíster)
-- Cada llavero impreso en 3D lleva un código corto único, ej: "USH-0001"
create table public.qr_tags (
  code text primary key,                        -- Código corto en la URL: /q/USH-0001
  batch_name text not null default 'LOTE-01',   -- Identificador de lote de producción 3D
  status text not null default 'unclaimed'      -- 'unclaimed' (virgen en blíster) | 'active' | 'paused'
    check (status in ('unclaimed', 'active', 'paused')),
  owner_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. TABLA DE PERFILES DE EMERGENCIA DEL PILOTO Y VEHÍCULO
-- Nota de Privacidad Antirrobo: NUNCA almacenar dirección de domicilio ni DNI completo.
create table public.rider_profiles (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique references public.qr_tags(code) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- a) Datos del Piloto
  full_name text not null,                      -- Nombre y Apellido
  nickname text,                                -- Apodo opcional
  nationality text default 'AR',                -- País (AR, BR, CL, US, etc.)
  doc_last_digits text                          -- Solo últimos 3 dígitos por privacidad antirrobo
    check (char_length(doc_last_digits) <= 4),
  rider_photo_url text,

  -- b) Condición Médica Crítica
  blood_type text not null default 'Desconocido'
    check (blood_type in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Desconocido')),
  has_medical_condition boolean not null default false,
  allergies text,                               -- Ej: Penicilina, Ibuprofeno, Látex
  medical_conditions text,                      -- Ej: Diabetes Tipo 1, Hipertensión, Asma
  medications text,                             -- Medicación habitual / Anticoagulantes
  health_insurance text,                        -- Obra Social / Seguro de Viaje (ej. Assist Card)
  health_insurance_number text,                 -- Número de afiliado / póliza médica
  organ_donor boolean,
  medical_notes_en text,                        -- Traducción opcional automática o manual al inglés
  medical_notes_pt text,                        -- Traducción opcional automática o manual al portugués

  -- d) Contactos de Emergencia
  emergency_contact_1_name text not null,
  emergency_contact_1_relation text not null,   -- Ej: Esposa, Padre, Compañero de ruta
  emergency_contact_1_phone text not null,      -- Formato internacional E.164 ej: +5492901123456
  emergency_contact_2_name text,
  emergency_contact_2_relation text,
  emergency_contact_2_phone text,

  -- e) Datos del Vehículo (Moto)
  bike_brand_model text not null,               -- Ej: Honda Africa Twin CRF1100L / BMW R1250GS
  bike_year int,
  bike_color text,
  bike_plate text,                              -- Patente / Dominio
  bike_photo_url text,                          -- URL en Supabase Storage
  bike_insurance_company text,                  -- Compañía de Seguro (ej. Federación Patronal, Rivadavia)
  bike_insurance_policy text,                   -- Número de póliza
  bike_insurance_phone text,                    -- Teléfono de grúa / auxilio mecánico
  hide_plate_publicly boolean not null default false, -- Opción extra antirrobo para ocultar patente

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Índices para lectura instantánea (<10ms) por código QR
create index idx_rider_profiles_qr_code on public.rider_profiles(qr_code);
create index idx_qr_tags_owner_id on public.qr_tags(owner_id);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================================================
alter table public.qr_tags enable row level security;
alter table public.rider_profiles enable row level security;

-- 1. Cualquier socorrista (sin login) puede consultar el estado de un QR y leer la ficha activa
create policy "Lectura pública de QR tags"
  on public.qr_tags for select
  using (true);

create policy "Lectura pública de fichas de emergencia activas"
  on public.rider_profiles for select
  using (
    exists (
      select 1 from public.qr_tags
      where qr_tags.code = rider_profiles.qr_code
        and qr_tags.status = 'active'
    )
    or auth.uid() = owner_id
  );

-- 2. Activación Libre (Primer Escaneo desde el blíster):
-- Un usuario autenticado puede reclamar un QR únicamente si su estado actual es 'unclaimed'
create policy "Reclamar QR virgen en primer escaneo"
  on public.qr_tags for update
  to authenticated
  using (status = 'unclaimed' or owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 3. Creación y edición de ficha: solo el dueño legítimo del QR puede insertar o actualizar sus datos
create policy "Piloto crea su propia ficha"
  on public.rider_profiles for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.qr_tags
      where qr_tags.code = rider_profiles.qr_code
        and qr_tags.owner_id = auth.uid()
    )
  );

create policy "Piloto actualiza su propia ficha"
  on public.rider_profiles for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================================
-- FUNCIÓN AUXILIAR PARA GENERAR LOTES DE QR DE FÁBRICA (Ej: Llavero Bambu Lab)
-- Uso: select public.generate_qr_batch('USH', 1, 50, 'FERIA-PUERTO-01');
-- ============================================================================
create or replace function public.generate_qr_batch(
  prefix text,
  start_num int,
  end_num int,
  batch text default 'LOTE-01'
)
returns int
language plpgsql
security definer
as $$
declare
  i int;
  new_code text;
  inserted_count int := 0;
begin
  for i in start_num..end_num loop
    new_code := upper(prefix) || '-' || lpad(i::text, 4, '0');
    insert into public.qr_tags (code, batch_name, status)
    values (new_code, batch, 'unclaimed')
    on conflict (code) do nothing;
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$$;
