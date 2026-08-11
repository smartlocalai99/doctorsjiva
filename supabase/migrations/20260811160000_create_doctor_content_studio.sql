-- DRJIVA doctor content studio: profiles, feed posts, row-level access, and media buckets.

create extension if not exists pgcrypto;

create table if not exists public.doctor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text not null unique,
  specialty text not null default '',
  qualifications text not null default '',
  registration_number text not null default '',
  bio text not null default '',
  avatar_path text,
  avatar_url text not null default '',
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  is_active boolean not null default true,
  follower_count bigint not null default 0 check (follower_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_posts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  caption text not null check (char_length(caption) between 1 and 1200),
  hashtags text[] not null default '{}',
  media_type text not null check (media_type in ('image', 'video')),
  media_path text,
  media_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  safety_note text,
  source_url text,
  views_count bigint not null default 0 check (views_count >= 0),
  likes_count bigint not null default 0 check (likes_count >= 0),
  comments_count bigint not null default 0 check (comments_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_posts_doctor_created_idx on public.health_posts (doctor_id, created_at desc);
create index if not exists health_posts_public_feed_idx on public.health_posts (published_at desc) where status = 'published';

alter table public.doctor_profiles enable row level security;
alter table public.health_posts enable row level security;

create policy "Public can view active doctor profiles"
on public.doctor_profiles for select
using (is_active = true);

create policy "Doctors can update their own profile"
on public.doctor_profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Doctors can insert their own profile"
on public.doctor_profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Public can view published posts"
on public.health_posts for select
using (status = 'published' or auth.uid() = doctor_id);

create policy "Doctors can create their own posts"
on public.health_posts for insert to authenticated
with check (auth.uid() = doctor_id);

create policy "Doctors can update their own posts"
on public.health_posts for update to authenticated
using (auth.uid() = doctor_id)
with check (auth.uid() = doctor_id);

create policy "Doctors can delete their own posts"
on public.health_posts for delete to authenticated
using (auth.uid() = doctor_id);

grant select on public.doctor_profiles, public.health_posts to anon, authenticated;
grant insert, update on public.doctor_profiles to authenticated;
grant insert, update, delete on public.health_posts to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists doctor_profiles_set_updated_at on public.doctor_profiles;
create trigger doctor_profiles_set_updated_at before update on public.doctor_profiles
for each row execute function public.set_updated_at();

drop trigger if exists health_posts_set_updated_at on public.health_posts;
create trigger health_posts_set_updated_at before update on public.health_posts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_doctor()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  generated_name text;
begin
  generated_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Doctor');
  insert into public.doctor_profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    generated_name,
    'doctor_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_doctor on auth.users;
create trigger on_auth_user_created_doctor
after insert on auth.users
for each row execute function public.handle_new_doctor();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('health-feed', 'health-feed', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('doctor-avatars', 'doctor-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Doctors can upload feed media"
on storage.objects for insert to authenticated
with check (bucket_id = 'health-feed' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Doctors can update feed media"
on storage.objects for update to authenticated
using (bucket_id = 'health-feed' and owner_id = auth.uid()::text)
with check (bucket_id = 'health-feed' and owner_id = auth.uid()::text);

create policy "Doctors can delete feed media"
on storage.objects for delete to authenticated
using (bucket_id = 'health-feed' and owner_id = auth.uid()::text);

create policy "Doctors can upload avatars"
on storage.objects for insert to authenticated
with check (bucket_id = 'doctor-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Doctors can update avatars"
on storage.objects for update to authenticated
using (bucket_id = 'doctor-avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'doctor-avatars' and owner_id = auth.uid()::text);

create policy "Doctors can delete avatars"
on storage.objects for delete to authenticated
using (bucket_id = 'doctor-avatars' and owner_id = auth.uid()::text);
