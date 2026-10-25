-- Notifications for the doctor app: every phone or computer where a doctor
-- turned them on, and the app's web-push (VAPID) keys.
-- Only the server (service role) reads or writes either.

create table if not exists public.doctor_push_subscriptions (
  endpoint text primary key,
  doctor_phone text not null references public.doctors(phone_number) on update cascade on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  -- The day the 8 AM "today's patients" message went to this device.
  summary_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_push_subscriptions_doctor_idx
on public.doctor_push_subscriptions (doctor_phone);

alter table public.doctor_push_subscriptions enable row level security;
revoke all on public.doctor_push_subscriptions from anon, authenticated;

create table if not exists private.web_push_keys (
  app text primary key,
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);

revoke all on private.web_push_keys from public, anon, authenticated;

-- The doctor app's keys. The first server call creates them (the keys are
-- generated on the server, so they are never in a migration or in git);
-- every later call gets the same pair back.
create or replace function public.doctor_push_keys(new_public_key text default null, new_private_key text default null)
returns table (public_key text, private_key text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new_public_key is not null and new_private_key is not null then
    insert into private.web_push_keys (app, public_key, private_key)
    values ('doctors', new_public_key, new_private_key)
    on conflict (app) do nothing;
  end if;
  return query select k.public_key, k.private_key from private.web_push_keys k where k.app = 'doctors';
end;
$$;

revoke all on function public.doctor_push_keys(text, text) from public, anon, authenticated;
grant execute on function public.doctor_push_keys(text, text) to service_role;
