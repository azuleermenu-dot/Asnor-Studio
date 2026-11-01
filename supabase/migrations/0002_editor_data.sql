-- Store visual editor project data separately from project metadata.
alter table public.projects add column if not exists editor_data jsonb not null default '{}'::jsonb;
