-- Phone-keyed doctor accounts for the temporary onboarding flow.
-- The test code is stored as a bcrypt hash in a private schema, never as plain text.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.doctors (
  phone_number text primary key check (phone_number ~ '^\+[1-9][0-9]{9,14}$'),
  display_name text not null,
  slug text not null unique,
  specialty text not null,
  hospital_name text not null,
  experience_years smallint not null check (experience_years between 0 and 80),
  qualifications text not null default '',
  city text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  follower_count bigint not null default 0 check (follower_count >= 0),
  verification_status text not null default 'verified' check (verification_status in ('pending', 'verified', 'rejected')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.doctor_access (
  phone_number text primary key references public.doctors(phone_number) on delete cascade,
  login_code_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.doctor_access enable row level security;
alter table public.doctors enable row level security;

alter table public.health_posts
  add column if not exists doctor_phone text references public.doctors(phone_number) on update cascade;

alter table public.health_posts alter column doctor_id drop not null;
alter table public.health_posts
  add constraint health_posts_has_one_doctor_key
  check (num_nonnulls(doctor_id, doctor_phone) = 1);

create index if not exists health_posts_doctor_phone_created_idx
on public.health_posts (doctor_phone, created_at desc);

drop policy if exists "Public can view active phone-keyed doctors" on public.doctors;
create policy "Public can view active phone-keyed doctors"
on public.doctors for select to anon, authenticated
using (is_active = true);

grant select on public.doctors to anon, authenticated;

insert into public.doctors (
  phone_number,
  display_name,
  slug,
  specialty,
  hospital_name,
  experience_years,
  qualifications,
  city,
  bio,
  follower_count,
  verification_status,
  is_active
)
values (
  '+919876543210',
  'Dr. Ritish Reddy',
  'dr-ritish-reddy',
  'Gastroenterology',
  'Asian Hospitals',
  8,
  'MBBS, MD, DM – Gastroenterology',
  'Hyderabad',
  'Gastroenterologist focused on digestive health, liver care and practical guidance patients can understand.',
  2840,
  'verified',
  true
)
on conflict (phone_number) do update set
  display_name = excluded.display_name,
  slug = excluded.slug,
  specialty = excluded.specialty,
  hospital_name = excluded.hospital_name,
  experience_years = excluded.experience_years,
  qualifications = excluded.qualifications,
  city = excluded.city,
  bio = excluded.bio,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into private.doctor_access (phone_number, login_code_hash)
values ('+919876543210', extensions.crypt('1234', extensions.gen_salt('bf', 10)))
on conflict (phone_number) do update set
  login_code_hash = excluded.login_code_hash,
  failed_attempts = 0,
  locked_until = null,
  updated_at = now();

create or replace function public.verify_doctor_login(input_phone text, input_code text)
returns table (
  phone_number text,
  display_name text,
  slug text,
  specialty text,
  hospital_name text,
  experience_years smallint,
  qualifications text,
  city text,
  bio text,
  avatar_url text,
  follower_count bigint,
  verification_status text
)
language sql
security definer
set search_path = ''
as $$
  select
    d.phone_number,
    d.display_name,
    d.slug,
    d.specialty,
    d.hospital_name,
    d.experience_years,
    d.qualifications,
    d.city,
    d.bio,
    d.avatar_url,
    d.follower_count,
    d.verification_status
  from public.doctors d
  join private.doctor_access access on access.phone_number = d.phone_number
  where d.phone_number = input_phone
    and d.is_active = true
    and (access.locked_until is null or access.locked_until <= now())
    and access.login_code_hash = extensions.crypt(input_code, access.login_code_hash)
  limit 1;
$$;

revoke all on function public.verify_doctor_login(text, text) from public, anon, authenticated;
grant execute on function public.verify_doctor_login(text, text) to service_role;
