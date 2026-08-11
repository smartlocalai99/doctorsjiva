create table public.doctor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text not null,
  specialty text not null default '',
  qualifications text not null default '',
  registration_number text not null default '',
  bio text not null default '',
  avatar_path text,
  avatar_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  is_active boolean not null default true,
  follower_count integer not null default 0 check (follower_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_profiles_username_length check (char_length(username) between 3 and 40),
  constraint doctor_profiles_registration_required check (char_length(registration_number) > 0)
);

create unique index doctor_profiles_username_lower_idx
  on public.doctor_profiles (lower(username));
create unique index doctor_profiles_registration_lower_idx
  on public.doctor_profiles (lower(registration_number));

create table public.health_posts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles(id) on delete cascade,
  title text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  media_type text not null check (media_type in ('image', 'video')),
  media_path text not null,
  media_url text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  safety_note text,
  source_url text,
  rejection_reason text,
  views_count integer not null default 0 check (views_count >= 0),
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_posts_title_length check (char_length(title) between 3 and 90),
  constraint health_posts_caption_length check (char_length(caption) between 3 and 1200),
  constraint health_posts_hashtag_limit check (cardinality(hashtags) <= 10),
  constraint health_posts_publication_time check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create index health_posts_doctor_created_idx
  on public.health_posts (doctor_id, created_at desc);
create index health_posts_feed_idx
  on public.health_posts (published_at desc, id desc)
  where status = 'published';

alter table public.doctor_profiles enable row level security;
alter table public.health_posts enable row level security;

create policy "verified doctors and owners can read doctor profiles"
  on public.doctor_profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (verification_status = 'verified' and is_active)
  );

create policy "doctors can create their pending profile"
  on public.doctor_profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and verification_status = 'pending'
    and is_active = true
    and follower_count = 0
  );

create policy "doctors can update their profile"
  on public.doctor_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "doctors and patients can read allowed health posts"
  on public.health_posts for select
  to authenticated
  using (
    doctor_id = (select auth.uid())
    or (
      status = 'published'
      and exists (
        select 1
        from public.doctor_profiles
        where doctor_profiles.id = health_posts.doctor_id
          and doctor_profiles.verification_status = 'verified'
          and doctor_profiles.is_active
      )
    )
  );

create policy "doctors can create drafts and review submissions"
  on public.health_posts for insert
  to authenticated
  with check (
    doctor_id = (select auth.uid())
    and status in ('draft', 'pending_review')
    and exists (
      select 1
      from public.doctor_profiles
      where doctor_profiles.id = (select auth.uid())
        and doctor_profiles.is_active
        and doctor_profiles.verification_status in ('pending', 'verified')
    )
  );

create policy "doctors can update their manageable posts"
  on public.health_posts for update
  to authenticated
  using (
    doctor_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'published', 'rejected')
  )
  with check (
    doctor_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected', 'archived')
  );

create or replace function public.preserve_doctor_managed_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id then
    new.verification_status := old.verification_status;
    new.is_active := old.is_active;
    new.follower_count := old.follower_count;
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_doctor_managed_fields() from public;

create trigger preserve_doctor_managed_fields_before_update
before update on public.doctor_profiles
for each row execute function public.preserve_doctor_managed_fields();

grant select, insert, update on public.doctor_profiles to authenticated;
grant select, insert, update on public.health_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('health-feed', 'health-feed', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('doctor-avatars', 'doctor-avatars', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "doctors can insert own health feed media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'health-feed'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "doctors can manage own health feed media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'health-feed'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'health-feed'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "doctors can read own health feed media metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'health-feed'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "doctors can insert own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "doctors can manage own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "doctors can read own avatar metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
