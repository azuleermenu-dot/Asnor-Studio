# Asnor Studio

A beginner-friendly visual no-code website builder. Users create websites with templates, drag-and-drop components, and design controls—without AI-generated websites.

## Current status — Phase 1 foundation

Implemented in this repository:
- Next.js App Router + TypeScript + Tailwind CSS scaffold
- Responsive studio landing page
- Supabase SSR client setup and auth flows (sign up, sign in, callback, sign out)
- Authenticated dashboard and project creation flow
- Initial PostgreSQL projects schema with owner-based Row Level Security
- Architecture notes and environment template

The GrapesJS editor, autosave, previews, asset uploads, and publishing pipeline are planned for later phases and are not implemented yet.

## Local development

1. Use Node.js 20.9 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase project URL and anon/publishable key.
5. Apply `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor.
6. For local development, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and add `http://localhost:3000/auth/callback` to Supabase Auth redirect URLs. For production, set `NEXT_PUBLIC_SITE_URL=https://asnor-studio-mvp-asnor-ali.vercel.app` in Vercel and configure Supabase Auth **Site URL** to that production URL (not localhost). Add the production callback URL `https://asnor-studio-mvp-asnor-ali.vercel.app/auth/callback` to the Supabase redirect URL allow list.
7. Run `npm run dev`.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never add a Supabase service-role key to client-visible environment variables.

## Security notes

- Project ownership is enforced by RLS.
- Server actions derive the owner from the authenticated session.
- User-created website content is untrusted.
- Published websites must be isolated from the studio app origin.

## MVP sequence

Register/sign in → create project → visual edit → save → preview → publish.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design and phases.
