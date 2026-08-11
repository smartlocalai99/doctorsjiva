-- Let open patient feeds receive newly published posts immediately.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'health_posts'
  ) then
    alter publication supabase_realtime add table public.health_posts;
  end if;
end;
$$;
