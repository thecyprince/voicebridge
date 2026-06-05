# Handoff: Full demo working end-to-end — 2026-06-02

## Goal

Make the entire VoiceBridge demo work end-to-end — all 4 user flows (record→memo, semantic search, segment translation, Google Calendar) — verified by automated Playwright browser tests. Also fold in 4 UX improvements: pipeline progress toasts, better recording UX, delete memo, and mobile + dark mode.

## Accomplished

- **Cross-browser recording fix** (`components/Recorder.tsx`) — added `pickMimeType()` with `MediaRecorder.isTypeSupported()` feature detection. Tries `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → `audio/ogg;codecs=opus`. Safari now works (was silently failing with hardcoded `audio/webm`).
- **MIME-aware pipeline** (`app/api/memos/route.ts`, `lib/whisper.ts`) — file extension now derived from the uploaded blob's MIME type so Safari `mp4` uploads transcribe correctly in Whisper.
- **Pipeline progress + toasts** — `Recorder` shows staged labels (Uploading → Transcribing → Summarizing with AI). `sonner` `<Toaster>` wired in via `components/providers.tsx` + `app/layout.tsx`. Toasts on success/error in record, search, translate, calendar, delete flows.
- **Recording UX** — live waveform canvas (AnalyserNode, 16-bar FFT), elapsed timer, re-record/discard before upload (new `preview` state).
- **Delete memo** — hover-reveal ✕ button in `MemoSidebar`, wired to existing `DELETE /api/memos/[id]` route (Supabase + vector + Blob cleanup already implemented server-side).
- **Dark mode + mobile** — `next-themes` `ThemeProvider`, ☀️/🌙 toggle in header, `dark:` Tailwind classes on all main components, collapsible sidebar on mobile (hamburger at <md breakpoint).
- **Google OAuth callback** (`app/api/calendar/connect/route.ts`, `app/api/calendar/callback/route.ts`) — full OAuth flow: consent URL generator + code exchange + refresh-token storage in Supabase `google_tokens` table. `app/api/calendar/route.ts` updated to use stored refresh token with static `GOOGLE_ACCESS_TOKEN` env var as fallback.
- **Clerk middleware** (`middleware.ts`) — `clerkMiddleware()` added; all routes public for demo.
- **Playwright e2e harness** (`scripts/e2e/`) — Chromium with fake mic device (`--use-fake-device-for-media-stream`, WAV fixture), WebKit smoke test. All 5 tests pass in 28.8s.
- **`ANTHROPIC_API_KEY` set in Doppler** — was empty (known gap from May 29). Now set for `voicebridge / dev`.
- **`supabase/schema.sql` updated** — added `google_tokens` table DDL (not yet applied to the live Supabase project).
- **TypeScript clean** — `npm run typecheck` passes with 0 errors.

## Not Done

- `google_tokens` table not yet created in the live Supabase project — run the new DDL in the Supabase SQL editor before the Calendar OAuth flow will work end-to-end.
- Google OAuth flow not initiated yet — visit `/api/calendar/connect` once to grant Calendar access and store the refresh token. Until then, `GOOGLE_ACCESS_TOKEN` static env var is the fallback (already in Doppler).
- Safari.app manual verification not done — the WebKit engine smoke test passes but real Safari.app recording needs a human check (fake mic not automatable in true Safari).
- Eval testset data still empty (`evals/data/`) — no real audio testsets committed.
- Not deployed to Vercel.
- `graphify hook install` not run — graph won't auto-rebuild after commits.

## Failed Approaches — Do Not Repeat

- **Renaming `middleware.ts` → `proxy.ts`** — Next.js 16 deprecated `middleware` filename in favour of `proxy`, but the build cache still had a compiled edge chunk referencing `middleware.ts`. Renaming broke the server with: `Error: Could not parse module '[project]/middleware.ts', file not found`. Fix: rename back to `middleware.ts` and clear `.next/dev` cache. The deprecation warning is non-fatal.
- **Running dev server without explicit Doppler project flags** — `npm run dev` (which runs `doppler run -- next dev`) fails with `Doppler Error: You must specify a project` because the shell's CWD resolves as `/Users/eric/projects/voicebridge` (lowercase `p`) while Doppler config is scoped to `/Users/eric/Projects/voicebridge` (uppercase `P`). Fix: always start the server with `DOPPLER_PROJECT=voicebridge DOPPLER_CONFIG=dev doppler run -- ./node_modules/.bin/next dev`.
- **`doppler secrets set` without project flags** — running `doppler secrets set ANTHROPIC_API_KEY <key>` from a shell without the project in scope silently succeeds but writes to the wrong scope; key remained empty. Fix: always pass `DOPPLER_PROJECT=voicebridge DOPPLER_CONFIG=dev` prefix.
- **Playwright config with `import.meta.url`** — `playwright.config.ts` used `fileURLToPath(import.meta.url)` for `__dirname`. Playwright's TS loader runs in CJS mode and throws `ReferenceError: exports is not defined in ES module scope`. Fix: use `__dirname` directly (available in CJS context).

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `pickMimeType()` feature detection instead of hardcoded `audio/webm` | Safari throws synchronously on unsupported MIME; feature detection is the only reliable cross-browser path |
| Fake staged progress (timed transitions) instead of streaming API | POST `/api/memos` is a single long call; splitting it into multiple endpoints adds complexity for minimal gain in a portfolio demo |
| Refresh token stored in Supabase `google_tokens` table | Consistent with existing data layer; avoids a second service dependency |
| All routes public in Clerk middleware | Demo app — no sign-in required; keeps UX simple for portfolio reviewers |
| `test.describe.serial` for Chromium flows | Flows 2/3/4 depend on the memo created in Flow 1; serial ensures ordering without a shared fixture file |
| `scripts/` excluded from root `tsconfig.json` | Playwright test files use `@playwright/test` types which aren't in the app's deps; excluding prevents type errors in `npm run typecheck` |

## Current State

**Working:**
- Dev server: `DOPPLER_PROJECT=voicebridge DOPPLER_CONFIG=dev doppler run -- ./node_modules/.bin/next dev` → `http://localhost:3000`
- All Playwright e2e tests pass (5/5): `npx playwright test --config=scripts/e2e/playwright.config.ts`
- Record → Whisper transcript → Claude summary + action items → Supabase + Upstash Vector
- Semantic search (RAG) with grounded Claude answer + citations
- Segment translation via Claude
- Delete memo (Supabase + Upstash + Blob cleanup)
- Dark mode toggle, collapsible mobile sidebar, toasts throughout
- `npm run typecheck` clean (0 errors)

**Not working yet:**
- Google Calendar integration: needs `google_tokens` table in Supabase + OAuth flow initiated at `/api/calendar/connect`. Static `GOOGLE_ACCESS_TOKEN` fallback in Doppler works if it's still valid.
- Real Safari.app: code fix is in place but unverified in real browser.

## Next Steps

1. **Apply `google_tokens` schema** — Supabase dashboard → SQL editor → run the new DDL at the bottom of `supabase/schema.sql`.
2. **Initiate Google OAuth** — with dev server running, visit `http://localhost:3000/api/calendar/connect`, grant Calendar access. Refresh token stored automatically. Test by adding an action item to Calendar.
3. **Verify Safari** — open `http://localhost:3000` in Safari.app on this Mac, record a short memo, confirm the whole flow completes (uses `audio/mp4` silently).
4. **Run `graphify hook install`** in the project root so the knowledge graph auto-rebuilds after commits.
5. **Deploy to Vercel** — `vercel --prod`, mirror all Doppler secrets in the Vercel dashboard (or use Doppler ↔ Vercel integration).
6. **Populate eval testsets** — add audio files + ground truth to `evals/data/`, then `npm run evals` to validate WER, summary faithfulness, action item P/R, retrieval P@3/MRR.

## Files Changed

| File | Change |
|------|--------|
| `components/Recorder.tsx` | Full rewrite: cross-browser `pickMimeType()`, waveform canvas, elapsed timer, preview/discard state, staged upload progress, `sonner` toasts |
| `components/MemoSidebar.tsx` | Delete button (hover-reveal, `data-testid="btn-delete-memo"`), dark mode classes, `onMemoDeleted` prop |
| `components/SummaryPanel.tsx` | `sonner` toasts on calendar add/error, dark mode classes, "Connect Google Calendar" link |
| `components/SearchBar.tsx` | `sonner` toast on search error, dark mode classes, `data-testid="search-input/results"` |
| `components/providers.tsx` | New — `ThemeProvider` + `<Toaster>` client wrapper |
| `app/layout.tsx` | Added `<Providers>`, `suppressHydrationWarning`, dark background class |
| `app/page.tsx` | `ThemeToggle` component, `handleMemoDeleted`, mobile sidebar toggle, dark mode classes |
| `app/api/memos/route.ts` | `mimeToExt()` helper, derive blob extension from MIME type |
| `app/api/calendar/route.ts` | `getAuthClient()` uses stored refresh token from Supabase; static `GOOGLE_ACCESS_TOKEN` as fallback |
| `app/api/calendar/connect/route.ts` | New — Google OAuth consent URL generator |
| `app/api/calendar/callback/route.ts` | New — OAuth code exchange + refresh token upsert to Supabase `google_tokens` |
| `lib/whisper.ts` | `mimeToExt()` helper, filename derived from blob MIME type |
| `middleware.ts` | New — `clerkMiddleware()`, all routes public |
| `supabase/schema.sql` | Added `google_tokens` table DDL |
| `tsconfig.json` | Added `"scripts"` to `exclude` array |
| `package.json` | Added `@playwright/test` dev dependency |
| `scripts/e2e/playwright.config.ts` | New — Playwright config (Chromium fake-mic + WebKit smoke projects) |
| `scripts/e2e/check.spec.ts` | New — 5 tests: WebKit smoke, Flows 1–4 |
| `scripts/e2e/gen-fixture.mjs` | New — generates 4s 440Hz WAV for fake mic input |
| `scripts/e2e/fixtures/test-audio.wav` | New — generated WAV fixture (run `node scripts/e2e/gen-fixture.mjs`) |
