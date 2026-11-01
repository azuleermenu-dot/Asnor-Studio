-- Harden project authorization and remove per-row auth.uid() evaluation.
-- This migration is intentionally safe to re-run.

alter table public.projects enable row level security;

drop policy if exists "Owners can read their projects" on public.projects;
drop policy if exists "Owners can create their projects" on public.projects;
drop policy if exists "Owners can update their projects" on public.projects;
drop policy if exists "Owners can delete their projects" on public.projects;

create policy "Owners can read their projects"
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can create their projects"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update their projects"
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their projects"
on public.projects for delete
to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$function$;

-- Least privilege: RLS is the row boundary; SQL grants should still expose only CRUD.
-- In particular, TRUNCATE bypasses RLS and must not be granted to app users.
revoke all on table public.projects from anon, authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
