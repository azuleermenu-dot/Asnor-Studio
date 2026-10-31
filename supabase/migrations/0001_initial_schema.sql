-- Asnor Studio Phase 1: project ownership and RLS
create extension if not exists pgcrypto;
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null default 'Untitled website' check (char_length(name) between 1 and 120),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists projects_owner_updated_idx on public.projects(owner_id,updated_at desc);
alter table public.projects enable row level security;
create policy "Owners can read their projects" on public.projects for select using (auth.uid()=owner_id);
create policy "Owners can create their projects" on public.projects for insert with check (auth.uid()=owner_id);
create policy "Owners can update their projects" on public.projects for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "Owners can delete their projects" on public.projects for delete using (auth.uid()=owner_id);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
grant select,insert,update,delete on public.projects to authenticated;
