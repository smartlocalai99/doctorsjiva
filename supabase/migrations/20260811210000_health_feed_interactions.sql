-- Persistent patient interactions for the Health Feed.
-- Anonymous Supabase users are still authenticated identities, so every
-- interaction remains private to its owner while aggregate counts stay public.

alter table public.health_posts
  add column if not exists saves_count bigint not null default 0
  check (saves_count >= 0);

create table if not exists public.health_post_likes (
  post_id uuid not null references public.health_posts(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, owner_user_id)
);

create table if not exists public.health_post_saves (
  post_id uuid not null references public.health_posts(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, owner_user_id)
);

create table if not exists public.health_post_views (
  post_id uuid not null references public.health_posts(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, owner_user_id)
);

create table if not exists public.health_doctor_follows (
  doctor_phone text not null references public.doctors(phone_number) on update cascade on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (doctor_phone, owner_user_id)
);

create table if not exists public.health_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.health_posts(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null check (char_length(trim(author_name)) between 1 and 80),
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists health_post_comments_post_created_idx
on public.health_post_comments (post_id, created_at desc);

create index if not exists health_post_likes_owner_created_idx
on public.health_post_likes (owner_user_id, created_at desc);

create index if not exists health_post_saves_owner_created_idx
on public.health_post_saves (owner_user_id, created_at desc);

create index if not exists health_doctor_follows_owner_created_idx
on public.health_doctor_follows (owner_user_id, created_at desc);

alter table public.health_post_likes enable row level security;
alter table public.health_post_saves enable row level security;
alter table public.health_post_views enable row level security;
alter table public.health_doctor_follows enable row level security;
alter table public.health_post_comments enable row level security;

create policy "Patients can view their own health post likes"
on public.health_post_likes for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can like published health posts"
on public.health_post_likes for insert to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.health_posts post
    where post.id = post_id and post.status = 'published'
  )
);

create policy "Patients can remove their own health post likes"
on public.health_post_likes for delete to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can view their own saved health posts"
on public.health_post_saves for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can save published health posts"
on public.health_post_saves for insert to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.health_posts post
    where post.id = post_id and post.status = 'published'
  )
);

create policy "Patients can remove their own saved health posts"
on public.health_post_saves for delete to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can view their own health post views"
on public.health_post_views for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can record published health post views"
on public.health_post_views for insert to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.health_posts post
    where post.id = post_id and post.status = 'published'
  )
);

create policy "Patients can view their own followed doctors"
on public.health_doctor_follows for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can follow active doctors"
on public.health_doctor_follows for insert to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.doctors doctor
    where doctor.phone_number = doctor_phone and doctor.is_active = true
  )
);

create policy "Patients can unfollow doctors"
on public.health_doctor_follows for delete to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Patients can read comments on published health posts"
on public.health_post_comments for select to authenticated
using (
  exists (
    select 1 from public.health_posts post
    where post.id = post_id and post.status = 'published'
  )
);

create policy "Patients can comment on published health posts"
on public.health_post_comments for insert to authenticated
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.health_posts post
    where post.id = post_id and post.status = 'published'
  )
);

create policy "Patients can delete their own health post comments"
on public.health_post_comments for delete to authenticated
using ((select auth.uid()) = owner_user_id);

grant select, insert, delete on public.health_post_likes to authenticated;
grant select, insert, delete on public.health_post_saves to authenticated;
grant select, insert on public.health_post_views to authenticated;
grant select, insert, delete on public.health_doctor_follows to authenticated;
grant select, insert, delete on public.health_post_comments to authenticated;

create or replace function private.adjust_health_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.health_posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.health_posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

create or replace function private.adjust_health_post_saves_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.health_posts
    set saves_count = saves_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.health_posts
  set saves_count = greatest(saves_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

create or replace function private.adjust_health_post_views_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.health_posts
    set views_count = views_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.health_posts
  set views_count = greatest(views_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

create or replace function private.adjust_health_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.health_posts
    set comments_count = comments_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.health_posts
  set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

create or replace function private.adjust_doctor_follower_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.doctors
    set follower_count = follower_count + 1
    where phone_number = new.doctor_phone;
    return new;
  end if;

  update public.doctors
  set follower_count = greatest(follower_count - 1, 0)
  where phone_number = old.doctor_phone;
  return old;
end;
$$;

revoke all on function private.adjust_health_post_likes_count() from public, anon, authenticated;
revoke all on function private.adjust_health_post_saves_count() from public, anon, authenticated;
revoke all on function private.adjust_health_post_views_count() from public, anon, authenticated;
revoke all on function private.adjust_health_post_comments_count() from public, anon, authenticated;
revoke all on function private.adjust_doctor_follower_count() from public, anon, authenticated;

create trigger health_post_likes_adjust_count
after insert or delete on public.health_post_likes
for each row execute function private.adjust_health_post_likes_count();

create trigger health_post_saves_adjust_count
after insert or delete on public.health_post_saves
for each row execute function private.adjust_health_post_saves_count();

create trigger health_post_views_adjust_count
after insert or delete on public.health_post_views
for each row execute function private.adjust_health_post_views_count();

create trigger health_post_comments_adjust_count
after insert or delete on public.health_post_comments
for each row execute function private.adjust_health_post_comments_count();

create trigger health_doctor_follows_adjust_count
after insert or delete on public.health_doctor_follows
for each row execute function private.adjust_doctor_follower_count();

-- Replace any seeded counters with the real interaction totals.
update public.health_posts post set
  likes_count = (select count(*) from public.health_post_likes item where item.post_id = post.id),
  comments_count = (select count(*) from public.health_post_comments item where item.post_id = post.id),
  views_count = (select count(*) from public.health_post_views item where item.post_id = post.id),
  saves_count = (select count(*) from public.health_post_saves item where item.post_id = post.id);

update public.doctors doctor set
  follower_count = (
    select count(*) from public.health_doctor_follows item
    where item.doctor_phone = doctor.phone_number
  );
