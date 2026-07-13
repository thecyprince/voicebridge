# VoiceBridge — Claude Instructions

Bilingual Korean+English AI voice memo app. Eric's portfolio project — demonstrates STT, RAG, LLM tool use, evals. Full details in `CLAUDE_REFERENCE.md`.

**Start of session:** read `HANDOFF.md` for current state and next steps.

## Rules — Do Not Break

- `lib/supabase.ts` and `lib/vector.ts` are **server-only** — never import in `"use client"` components
- `summarizeMemo()` uses **forced tool choice** — do not change to freeform prompt
- `answerFromMemos()` has **prompt caching** (`cache_control: ephemeral`) — keep it, cuts cost ~70%
- Chunk IDs are `{memoId}_{index}` — `deleteByMemoId()` depends on this pattern
- `types/index.ts` is the single source of truth for shared types

## Commands

```bash
npm run dev        # localhost:3000
npm run typecheck  # must pass clean before any commit
npm run evals      # requires populated evals/data/
```

## Production Troubleshooting — check in THIS order

Lessons from the 2026-06-26/27 incident (2 days lost starting from the wrong end):

1. **Any prod 500 / "could not resolve authentication method":** run `./scripts/health-check.sh` first. It checks prod, `/api/ping` (Supabase/Upstash pause state), `/api/health` (empty env vars), and Doppler↔Vercel key drift in one shot.
2. **"Could not resolve authentication method"** is thrown by BOTH the Anthropic and OpenAI SDKs — grep `node_modules` for the exact error string to identify which SDK before touching anything.
3. **Empty env vars in Vercel** are the known failure mode (silent Doppler disconnect; dashboard saves can persist empty strings). `vercel env pull` redacts sensitive values, so "empty" is invisible locally — trust `/api/health`, not pulled files. Fix: `./scripts/sync-secrets.sh`, never the Vercel dashboard UI.
4. **Same opaque 500 also comes from free-tier auto-pause** (Supabase + Upstash both pause after ~7 idle days). `/api/ping` JSON says which one (`rejected`). A paused service can mask a separate env-var problem — after unpausing, re-run the health check.
5. **Prefer CLI over dashboard walkthroughs** — `vercel env`, `doppler secrets`, `supabase` CLI. Guiding the user through web UIs Claude can't see caused multi-turn loops; only fall back to the dashboard when no CLI equivalent exists.

## Known Gaps (2026-05-21)

- `ClerkProvider` not yet added to `app/layout.tsx`
- `evals/data/` is empty — no testsets yet
- No mobile layout
- Next.js `middleware` file convention is deprecated (deploy logs a warning) — migrate to the `proxy` convention: https://nextjs.org/docs/messages/middleware-to-proxy

## Google Calendar OAuth (2026-07-03)

- Full OAuth flow is implemented: `/api/calendar/connect` → consent → `/api/calendar/callback` stores the **refresh token** in the `google_tokens` Supabase table (id `default`). `GOOGLE_ACCESS_TOKEN` is now only a legacy fallback — no longer required.
- Redirect URI is **derived from the request origin** (`lib/google-oauth.ts`), not `GOOGLE_REDIRECT_URI`. This is intentional: `sync-secrets.sh` copies Doppler-dev→Vercel-prod, so a static redirect env can't hold localhost and prod at once.
- **Manual (console-only) step when the prod domain changes:** add `<origin>/api/calendar/callback` to the OAuth client's Authorized redirect URIs in Google Cloud Console. Currently registered must include `http://localhost:3000/api/calendar/callback` and `https://voicebridge-one.vercel.app/api/calendar/callback`. Symptom if missing: `redirect_uri_mismatch`.
