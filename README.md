# Asnor Studio

A beginner-friendly, visual no-code website builder. Users build websites with templates, drag-and-drop components, and design controls—no AI website generation.

## Project status

Phase 1 foundation is being initialized. The current scaffold is intentionally small; authentication and project persistence will be wired to Supabase when environment credentials are configured.

## Planned stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, and Storage
- GrapesJS for the visual editor (Phase 2)
- Vercel for the studio app
- Separate static hosting/CDN for published websites (publishing phase)

## Local development

1. Install Node.js 20.9+.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and add Supabase project values.
4. Start the app: `npm run dev`

## Security principles

- Enforce user ownership server-side and with Supabase RLS.
- Never expose the Supabase service-role key in browser code.
- Treat user-created website content as untrusted.
- Published sites must be isolated from the studio application.

## Current MVP sequence

Register/sign in → create project → visually edit → save → preview → publish.

See `docs/ARCHITECTURE.md` for the initial system architecture and implementation plan.
