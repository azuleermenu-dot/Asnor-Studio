# Asnor Studio

Asnor Studio is a beginner-friendly visual website builder. People create sites using templates, drag-and-drop components, and visual design controls—not AI-generated websites.

## Current implementation

The repository currently contains the application foundation and an early visual editor:

- Next.js App Router, React, TypeScript, and Tailwind CSS.
- Supabase Auth with Google OAuth and email one-time-code sign-in.
- Server-side session refresh and optional 30-day “Keep me logged in” preference.
- Authenticated dashboard and project creation.
- PostgreSQL projects table protected by owner-based Row Level Security.
- GrapesJS editor with basic content blocks and device preview controls.
- Autosave routed through a server-authorized API endpoint, with request-size limits.
- Baseline HTTP security headers and CI checks for linting, type checking, and builds.

## Not implemented yet

This is not yet a production-ready website builder. The following core capabilities still need implementation and end-to-end testing:

- Full design controls, page management, templates, and asset library.
- Recovery/version history and robust offline/retry handling.
- Safe publishing pipeline, isolated public website hosting, and republishing.
- Custom domains, collaboration, forms, analytics, and marketplace features.
- Full security, accessibility, performance, and cross-device QA.

## Local development

1. Use Node.js 22.
2. Install locked dependencies: `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase project URL and anon/publishable key.
5. Apply the SQL migrations in `supabase/migrations` in order. Migration 0003 hardens project ownership policies and the timestamp trigger.
6. For local development, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and allow `http://localhost:3000/auth/callback` in Supabase Auth redirect URLs. For production, use the production studio URL and allow its `/auth/callback` path.
7. Run `npm run dev`.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never add a Supabase service-role key to any `NEXT_PUBLIC_*` variable or browser code.

## Security boundaries

- Server routes derive the signed-in user from Supabase Auth; the client never chooses the project owner.
- PostgreSQL RLS remains the database-level ownership boundary.
- Autosave accepts only JSON editor data, enforces a size limit, and updates only the authenticated owner’s project.
- Website content is untrusted. Do not render user HTML on the studio origin or publish it until a dedicated sanitizer, validator, and isolated hosting pipeline exist.

## Intended MVP flow

Register/sign in → create project → visually edit → save/reopen → preview → publish → update and republish.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system boundaries and phases.
