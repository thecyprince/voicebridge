# Handoff: VoiceBridge — Doppler, Graphify, Second Brain setup — 2026-05-29 (`3b89344`)

## Goal

Set up Doppler for cross-machine secret management, run the initial graphify knowledge graph on the codebase, and clarify how the Obsidian second brain + graphify + memory systems work together.

## Accomplished

- **Doppler installed and configured** (`winget install Doppler.doppler`)
  - All `.env.local` secrets uploaded to Doppler project `voicebridge / dev`
  - `doppler.yaml` added to project root — links the repo to the Doppler project
  - `npm run dev` updated to `doppler run -- next dev` (secrets injected at runtime, no `.env.local` needed on new machines)
  - On a new machine: `doppler login` → `doppler setup` → `npm run dev` — no manual env file copying
- **ClerkProvider added to `app/layout.tsx`** — this was a known gap from the previous session
- **Graphify knowledge graph built** for the voicebridge codebase
  - 248 nodes, 417 edges, 17 communities — output in `graphify-out/`
  - `graphify hook install` not yet run (graph will not auto-rebuild on commits until this is done)
  - God nodes: `cn()` (20 edges), `Memo` (12 edges), `summarizeMemo()` (11 edges)
  - 10.5x token reduction for future codebase questions
- **Second brain CLAUDE.md updated** — added rule: check `decisions/` before answering questions about past work
- **`.gitignore` updated** — excludes Google client secret file (`client_secret_*.json`) and graphify machine-specific files (`.graphify_python`, `.graphify_root`, `cache/`, `graph.html`)
- All changes committed and pushed (`3b89344`)

## Not Done

- [ ] `graphify hook install` not run — graph won't auto-rebuild after commits
- [ ] `doppler login` + `doppler setup` not done on Mac yet
- [ ] Supabase project created + schema applied
- [ ] Upstash Vector index created
- [ ] Vercel Blob store created
- [ ] Clerk app created (keys are in Doppler but app may not exist yet)
- [ ] Google OAuth callback route not implemented — Calendar needs manual `GOOGLE_ACCESS_TOKEN`
- [ ] App not yet started end-to-end (`npm run dev` not smoke-tested)
- [ ] Eval testset data empty (`evals/data/`)
- [ ] Deployed to Vercel
- [ ] `ANTHROPIC_API_KEY` is empty in Doppler — needs to be filled in

## Failed Approaches — Do Not Repeat

- `doppler login` failed in the current shell after winget install — winget modifies PATH but the running shell doesn't see it. Fix: open a new terminal after installing, or use the full path `C:\Users\thecy\AppData\Local\Microsoft\WinGet\Packages\Doppler.doppler_Microsoft.Winget.Source_8wekyb3d8bbwe\doppler.exe`.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Doppler over SCP or git-crypt | Free, purpose-built, cross-platform, works with Vercel. `doppler setup` on any new machine is the only step needed. |
| `doppler run -- next dev` in package.json | Secrets injected at runtime — no `.env.local` file needed on Mac or CI |
| `graphify-out/cache/` and `graph.html` gitignored | Cache is machine-local and large; HTML can be regenerated with `graphify export html` |
| `graphify-out/graph.json` committed | Enables `graphify query` in future sessions without re-extraction |
| `client_secret_*.json` gitignored | Contains Google OAuth credentials — must never be committed |

## Current State

**Working:**
- TypeScript compiles clean (`npm run typecheck` → 0 errors)
- All source files in place
- Doppler project `voicebridge / dev` has all secrets (except `ANTHROPIC_API_KEY` which is blank)
- `doppler.yaml` committed — `doppler setup` on Mac will auto-connect
- ClerkProvider now wired into `app/layout.tsx`
- Graphify graph queryable: `graphify query "<question>"` works from the project root

**Not working yet:**
- App cannot run end-to-end without external services (Supabase, Upstash, Clerk, Vercel Blob) being created
- `ANTHROPIC_API_KEY` is blank in Doppler — must be filled in before Claude features work

## Next Steps

1. **Fill in `ANTHROPIC_API_KEY` in Doppler dashboard** (doppler.com → voicebridge → dev)
2. **Set up external services** (if not done — Supabase, Upstash Vector, Vercel Blob, Clerk)
3. **On Mac**: `doppler login` → `cd ~/projects/voicebridge` → `doppler setup` → `npm run dev`
4. **Run `graphify hook install`** in the project root so the graph auto-rebuilds after commits
5. **Smoke-test the app**: record a 30-second memo, verify transcript, summary, action items
6. **Fix any runtime errors** (API key mismatches, Supabase RLS, CORS on Vercel Blob)
7. **Implement Google OAuth callback** at `app/api/calendar/callback/route.ts` so Calendar doesn't need a manual access token
8. **Deploy to Vercel** (`vercel --prod`), set Doppler → Vercel env sync or manually add vars

## Files Changed

| File | Change |
|------|--------|
| `app/layout.tsx` | Added `ClerkProvider` wrapping the html/body |
| `package.json` | `dev` script changed to `doppler run -- next dev` |
| `doppler.yaml` | New file — links repo to Doppler project `voicebridge / dev` |
| `.gitignore` | Added exclusions for `client_secret_*.json`, `graphify-out/.graphify_python`, `graphify-out/.graphify_root`, `graphify-out/cache/`, `graphify-out/graph.html` |
| `graphify-out/graph.json` | New — raw knowledge graph data (248 nodes, 417 edges) |
| `graphify-out/GRAPH_REPORT.md` | New — audit report with god nodes, surprising connections, suggested questions |
| `graphify-out/.graphify_labels.json` | New — community labels for the graph visualizer |
| `graphify-out/.vocab.txt` | New — vocabulary index for graphify query expansion |
| `graphify-out/manifest.json` | New — graphify file manifest for incremental updates |
| `graphify-out/cost.json` | New — token cost tracker for graphify runs |
