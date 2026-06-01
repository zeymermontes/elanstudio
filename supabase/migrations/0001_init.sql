-- ============================================================================
-- ÉLANSTUDIO — initial schema, RLS policies and seed data
-- Apply in the Supabase SQL editor (or via the Supabase CLI).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users) + role
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text default '',
  role        text not null default 'member' check (role in ('member','admin')),
  created_at  timestamptz not null default now()
);

-- Helper: is the current user an admin? (security definer to avoid RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Brand / site settings (singleton row, id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id             smallint primary key default 1 check (id = 1),
  studio_name    text not null default 'ÉLANSTUDIO',
  tagline        text not null default 'Built by two · Designed for all',
  primary_color  text not null default '#e29aaa',
  accent_color   text not null default '#c7a86a',
  bg_color       text not null default '#f8f4ef',
  logo_url       text,
  whatsapp       text default '',
  email          text default '',
  instagram      text default '',
  address        text default '',
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content: services, class types, coaches, locations, packages
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  "order"     int not null default 0
);

create table if not exists public.class_types (
  id               uuid primary key default gen_random_uuid(),
  service_id       uuid references public.services(id) on delete set null,
  name             text not null,
  description      text not null default '',
  duration_min     int not null default 50,
  level            text not null default 'Todos los niveles',
  default_capacity int not null default 10,
  image_url        text
);

create table if not exists public.coaches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null default '',
  bio         text not null default '',
  specialties text[] not null default '{}',
  photo_url   text,
  instagram   text
);

create table if not exists public.locations (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  address  text not null default '',
  city     text not null default '',
  hours    text not null default '',
  map_url  text
);

create table if not exists public.packages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  credits       int not null default 1,
  price_mxn     numeric(10,2) not null default 0,
  validity_days int not null default 30,
  featured      boolean not null default false,
  active        boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Schedule: class sessions + bookings
-- ---------------------------------------------------------------------------
create table if not exists public.class_sessions (
  id            uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references public.class_types(id) on delete cascade,
  coach_id      uuid references public.coaches(id) on delete set null,
  location_id   uuid references public.locations(id) on delete set null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  capacity      int not null default 10,
  status        text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_sessions_starts_at on public.class_sessions(starts_at);

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null references public.class_sessions(id) on delete cascade,
  status      text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at  timestamptz not null default now(),
  unique (user_id, session_id)
);
create index if not exists idx_bookings_session on public.bookings(session_id);

-- ---------------------------------------------------------------------------
-- Payments: purchases + credit ledger (balance = sum of deltas)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  package_id    uuid references public.packages(id) on delete set null,
  amount_mxn    numeric(10,2) not null default 0,
  credits       int not null default 0,
  mp_payment_id text,
  mp_preference_id text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_purchases_user on public.purchases(user_id);

create table if not exists public.credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  delta       int not null,            -- +credits on purchase, -1 on booking
  reason      text not null,           -- 'purchase' | 'booking' | 'refund'
  ref_id      uuid,                    -- purchase or booking id
  created_at  timestamptz not null default now()
);
create index if not exists idx_ledger_user on public.credit_ledger(user_id);

-- Current credit balance for a user.
create or replace function public.credit_balance(p_user uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(delta), 0)::int
  from public.credit_ledger
  where user_id = p_user;
$$;

-- Atomically reserve a spot: validates capacity + credits, then writes the
-- booking and a -1 ledger entry. Returns a status code.
-- Codes: ok | auth | closed | already | full | no_credits
create or replace function public.book_session(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_cap    int;
  v_status text;
  v_count  int;
  v_bal    int;
begin
  if v_user is null then return 'auth'; end if;

  select capacity, status into v_cap, v_status
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  if exists (
    select 1 from public.bookings
    where user_id = v_user and session_id = p_session and status = 'confirmed'
  ) then return 'already'; end if;

  select count(*) into v_count from public.bookings
  where session_id = p_session and status = 'confirmed';
  if v_count >= v_cap then return 'full'; end if;

  select public.credit_balance(v_user) into v_bal;
  if v_bal <= 0 then return 'no_credits'; end if;

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, -1, 'booking', p_session);

  return 'ok';
end;
$$;

-- Cancel a booking and refund the credit. Codes: ok | auth | notfound
create or replace function public.cancel_booking(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then return 'auth'; end if;

  update public.bookings set status = 'cancelled'
  where user_id = v_user and session_id = p_session and status = 'confirmed';
  if not found then return 'notfound'; end if;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, 1, 'refund', p_session);

  return 'ok';
end;
$$;

grant execute on function public.book_session(uuid)   to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.credit_balance(uuid) to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.site_settings  enable row level security;
alter table public.services       enable row level security;
alter table public.class_types    enable row level security;
alter table public.coaches        enable row level security;
alter table public.locations      enable row level security;
alter table public.packages       enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings       enable row level security;
alter table public.purchases      enable row level security;
alter table public.credit_ledger  enable row level security;

-- Public-readable content; admin-writable.
do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','services','class_types','coaches','locations',
    'packages','class_sessions'
  ]
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_read" on public.%1$s for select using (true);', t);

    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_admin_write" on public.%1$s for all
         using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Profiles: self read/update; admins everything.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Bookings: members manage their own; admins all.
drop policy if exists bookings_self on public.bookings;
create policy bookings_self on public.bookings
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Purchases: members read their own; admins all. Writes happen via service role
-- (Mercado Pago webhook / server actions), which bypasses RLS.
drop policy if exists purchases_self_read on public.purchases;
create policy purchases_self_read on public.purchases
  for select using (user_id = auth.uid() or public.is_admin());

-- Credit ledger: members read their own; admins all. Writes via service role.
drop policy if exists ledger_self_read on public.credit_ledger;
create policy ledger_self_read on public.credit_ledger
  for select using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Seed data (idempotent-ish: only when empty)
-- ============================================================================
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

insert into public.services (name, slug, description, "order")
select * from (values
  ('Reformer Pilates','reformer','Pilates en máquina reformer: fuerza, control y precisión con bajo impacto.',1),
  ('Barre','barre','Técnica inspirada en el ballet para tonificar, alargar y mejorar la postura.',2),
  ('Mat & Flow','mat','Pilates en colchoneta, movilidad y respiración consciente para todos los niveles.',3)
) v(name,slug,description,ord)
where not exists (select 1 from public.services);

insert into public.coaches (name, role, bio, specialties, instagram)
select * from (values
  ('Valentina Ríos','Fundadora · Reformer','Instructora certificada con más de 10 años guiando a mujeres hacia una práctica fuerte y consciente.', array['Reformer','Rehabilitación','Pre/Postnatal'],'valentina.elan'),
  ('Camila Duarte','Co-fundadora · Barre','Bailarina profesional convertida en coach. Su clase de Barre es pura elegancia y disciplina.', array['Barre','Flexibilidad','Postura'],'camila.elan'),
  ('Renata Solís','Coach · Mat & Flow','Especialista en movilidad y respiración. Acompaña a principiantes con calidez y paciencia.', array['Mat Pilates','Movilidad','Respiración'],'renata.elan')
) v(name,role,bio,specialties,instagram)
where not exists (select 1 from public.coaches);

insert into public.locations (name, address, city, hours)
select * from (values
  ('ÉLANSTUDIO Polanco','Av. Presidente Masaryk 123, Polanco','Ciudad de México','Lun–Vie 6:00–21:00 · Sáb 8:00–14:00'),
  ('ÉLANSTUDIO Condesa','Av. Ámsterdam 45, Hipódromo Condesa','Ciudad de México','Lun–Vie 7:00–20:00 · Sáb 9:00–13:00')
) v(name,address,city,hours)
where not exists (select 1 from public.locations);

insert into public.packages (name, description, credits, price_mxn, validity_days, featured)
select * from (values
  ('Clase individual','Una clase para probar tu primera experiencia ÉLAN.',1,350,30,false),
  ('Paquete 5 clases','Cinco clases para empezar a crear tu rutina.',5,1550,60,false),
  ('Paquete 10 clases','Diez clases con la mejor relación valor–constancia.',10,2800,90,true),
  ('Mensualidad ilimitada','Un mes de clases ilimitadas para vivir ÉLAN por completo.',999,4200,30,false)
) v(name,description,credits,price,validity,featured)
where not exists (select 1 from public.packages);

-- Class types (linked to services by slug)
insert into public.class_types (service_id, name, description, duration_min, level, default_capacity)
select s.id, v.name, v.description, v.duration_min, v.level, v.cap
from (values
  ('reformer','Reformer Flow','Secuencias fluidas en reformer que combinan fuerza y estiramiento.',50,'Todos los niveles',8),
  ('reformer','Reformer Sculpt','Trabajo de tonificación profunda con resistencia progresiva.',50,'Intermedio',8),
  ('barre','Barre Sculpt','Movimientos isométricos de ballet para esculpir y alargar.',45,'Todos los niveles',12),
  ('mat','Mat & Flow','Pilates en colchoneta con foco en core y movilidad.',50,'Principiante',14)
) v(slug,name,description,duration_min,level,cap)
join public.services s on s.slug = v.slug
where not exists (select 1 from public.class_types);

-- Seed one week of upcoming sessions (07:00, 09:00, 18:00 daily, Mon–Sat).
insert into public.class_sessions (class_type_id, coach_id, location_id, starts_at, ends_at, capacity)
select
  ct.id,
  (select id from public.coaches order by random() limit 1),
  (select id from public.locations order by random() limit 1),
  slot,
  slot + (ct.duration_min || ' minutes')::interval,
  ct.default_capacity
from generate_series(
       date_trunc('day', now()),
       date_trunc('day', now()) + interval '6 days',
       interval '1 day'
     ) as day
cross join unnest(array['07:00','09:00','18:00']::time[]) as hh
cross join lateral (
  select id, duration_min, default_capacity
  from public.class_types order by random() limit 1
) ct
cross join lateral (select (day + hh) as slot) s
where extract(dow from day) <> 0   -- skip Sundays
  and not exists (select 1 from public.class_sessions);
