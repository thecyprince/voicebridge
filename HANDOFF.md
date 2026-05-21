# Handoff: Korean Voice Memo — Initial Scaffold — 2026-05-21 (`2eb81a5`)

## Goal

Build a bilingual Korean+English AI voice memo assistant as a personal portfolio project. The app records audio, transcribes it with Whisper, generates a summary and action items with Claude, stores segments in a vector store for semantic search (RAG), and integrates with Google Calendar. It doubles as a proof point of hands-on LLM/AI skills for Eric's job search.

## Accomplished

- Scaffolded a Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui project at `~/Projects/korean-voice-memo`
- Installed all dependencies (OpenAI, Anthropic SDK, Upstash Vector, Supabase, Vercel Blob, Clerk, googleapis)
- Wrote the complete AI pipeline: Whisper STT → Claude summary/action items (via tool use) → embeddings → Upstash Vector upsert
- Wrote all 5 API routes: POST/GET `/api/memos`, GET/DELETE `/api/memos/[id]`, GET `/api/search`, POST `/api/translate`, POST `/api/calendar`
- Wrote all 5 UI components: `Recorder`, `TranscriptView`, `MemoSidebar`, `SummaryPanel`, `SearchBar`
- Wrote main page (`app/page.tsx`) wiring components together
- Wrote Supabase schema (`supabase/schema.sql`)
- Wrote eval harness: WER, LLM-as-judge, action item precision/recall, retrieval P@3/MRR (`evals/`)
- TypeScript check passes clean: `npm run typecheck` → 0 errors
- Fixed career-ops bug: `modes/_profile.md` previously had "demonstrated via career-ops" in Cross-cutting Advantages, causing the AI to hallucinate career-ops as a user project in CVs. Fixed that line. Also added LG facial recognition and touch algorithm as proper Projects entries in `cv.md`.

## Not Done

The app is scaffolded but **not yet running end-to-end** — it needs real external service credentials before it can be started. None of the following are set up yet:

- [ ] `.env.local` file with actual API keys
- [ ] Supabase project created + schema applied
- [ ] Upstash Vector index created
- [ ] Vercel Blob store created
- [ ] Clerk app created
- [ ] Google Cloud project + Calendar API enabled + OAuth credentials
- [ ] App actually started (`npm run dev`) and smoke-tested
- [ ] Clerk auth wired into layout (currently Clerk is installed but `ClerkProvider` not added to `app/layout.tsx`)
- [ ] Eval testset data populated (`evals/data/` is empty — no audio files or JSON testsets yet)
- [ ] Deployed to Vercel

## Failed Approaches — Do Not Repeat

None. The scaffold went cleanly.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js 15 App Router | Vercel-native, recruiter-friendly demo URL, modern stack |
| Upstash Vector (not Supabase pgvector) | Serverless — no infra to manage on Vercel free tier |
| Supabase Postgres for memo rows | Free tier, simple, handles JSONB for segments/action items |
| OpenAI `text-embedding-3-small` | Multilingual (handles Korean), cheap, 1536-dim |
| Claude tool use for summarization | Structured output — guarantees `{title, summary, topics, action_items}` shape |
| Prompt caching on RAG system prompt | Repeated queries against the same grounded-answer system prompt hit cache (~70% cost reduction) |
| Eval harness built from day one | Portfolio piece in itself; Claude Opus as judge for Sonnet summaries |
| Per-segment language detection via character regex | Whisper v1 API returns one language per file, not per segment; Korean chars (`[가-힣]`) used to infer segment language |

## Current State

**Working:** TypeScript compiles clean. All files in place. Project structure complete.

**Not working yet:** App cannot be started until `.env.local` is populated with real credentials (Supabase, Upstash, OpenAI, Anthropic, Clerk, Vercel Blob, Google).

**Known gap — Clerk not wired into layout:** `@clerk/nextjs` is installed and the API keys are in `.env.example`, but `ClerkProvider` has not been added to `app/layout.tsx`. This needs to be done before the app can run with auth. Either wrap the layout in `<ClerkProvider>` or remove Clerk for MVP and add it later.

## Next Steps

1. **Create external services** (one-time setup, ~1 hour):
   - Supabase: create project, run `supabase/schema.sql` in SQL editor
   - Upstash: create a Vector index (dimensions: 1536, metric: cosine)
   - Vercel: create a Blob store
   - Clerk: create application, get publishable key + secret key
   - Google Cloud: enable Calendar API, create OAuth 2.0 credentials (Web app), add `http://localhost:3000/api/calendar/callback` as redirect URI

2. **Populate `.env.local`**: copy `.env.example` → `.env.local`, fill in all values

3. **Wire Clerk into layout**: add `<ClerkProvider>` to `app/layout.tsx` and add sign-in/sign-up routes under `app/(auth)/`

4. **Run the MVP** (`npm run dev`): record a 30-second memo and verify the full pipeline — transcript appears, summary renders, action items show

5. **Fix any runtime errors** that come up (API key mismatches, Supabase RLS issues, CORS on Vercel Blob, etc.)

6. **Populate eval testsets**: record 15 audio clips (5 Korean-only, 5 English-only, 5 code-switched) with ground-truth transcripts → `evals/data/wer-testset.json`

7. **Deploy to Vercel** (`vercel --prod`), set all env vars in dashboard

8. **Add to CV**: once deployed, add "Korean Voice Memo" as the third project entry in `cv.md` with the Vercel URL

## How the Project Was Created

```bash
# Scaffold
cd ~/Projects
npx create-next-app@latest korean-voice-memo --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack --yes

# Dependencies
cd korean-voice-memo
npm install @anthropic-ai/sdk openai @upstash/vector @supabase/supabase-js @vercel/blob googleapis
npm install @clerk/nextjs word-error-rate
npm install -D tsx

# shadcn/ui
npx shadcn@latest init --defaults
npx shadcn@latest add badge card scroll-area textarea sonner separator

# All other files written by Claude Code in this session
```

## Files Changed — What Each File Does

### Config / Root
| File | Purpose |
|------|---------|
| `.env.example` | Template listing all required env vars with comments. Copy to `.env.local` and fill in. |
| `.gitignore` | Standard Next.js gitignore + `evals/data/audio/` excluded (audio too large for git) |
| `package.json` | Added `"typecheck": "tsc --noEmit"` and `"evals": "tsx evals/run-all.ts"` scripts |
| `README.md` | Public-facing documentation: features, stack table, setup steps, eval targets, deploy |
| `supabase/schema.sql` | SQL to run in Supabase dashboard. Creates the `memos` table with UUID primary key, JSONB columns for segments and action items. |

### Types
| File | Purpose |
|------|---------|
| `types/index.ts` | Shared TypeScript types: `Memo`, `TranscriptSegment`, `ActionItem`, `SearchResult`, `Language` |

### Lib (AI pipeline)
| File | Purpose |
|------|---------|
| `lib/whisper.ts` | Calls OpenAI Whisper API (`verbose_json` with segment timestamps). Detects language per segment using Korean character regex (`[가-힣]`) since Whisper v1 only returns one language per file. |
| `lib/claude.ts` | Three Claude functions: `summarizeMemo()` (tool use → structured output), `answerFromMemos()` (RAG with prompt caching), `translateSegment()` (on-demand segment translation) |
| `lib/embeddings.ts` | Thin wrapper around OpenAI `text-embedding-3-small`. `embedText()` and `embedBatch()` |
| `lib/chunker.ts` | Splits transcript segments into ~400-token chunks with 1-segment overlap. Korean-aware token estimation (Korean chars ≈ 2 chars/token, Latin ≈ 4 chars/token). |
| `lib/vector.ts` | Upstash Vector upsert and query. `upsertChunks()`, `queryVector()`, `deleteByMemoId()`. |
| `lib/supabase.ts` | Supabase server-side client (service role). CRUD for memos: `saveMemo`, `listMemos`, `getMemo`, `getMemosByIds`, `deleteMemo`, `updateActionItemCalendarId`. |
| `lib/utils.ts` | shadcn/ui utility (auto-generated by shadcn) |

### Lib / Prompts
| File | Purpose |
|------|---------|
| `lib/prompts/summarize.ts` | System prompt + tool schema for Claude structured extraction (`title`, `summary`, `topics`, `action_items[]`). Tool choice is forced to `extract_memo_info`. |
| `lib/prompts/grounded-answer.ts` | System prompt + user prompt builder for RAG. Formats retrieved contexts with memo titles and instructs Claude to answer only from retrieved excerpts. |
| `lib/prompts/translate.ts` | Single-function prompt builder for `translateSegment()`. Returns only the translation, no explanation. |

### API Routes
| File | Purpose |
|------|---------|
| `app/api/memos/route.ts` | **POST**: full pipeline — upload audio → Vercel Blob, Whisper transcription, Claude summary, embed + upsert to Upstash, save to Supabase. Returns the full `Memo` object. **GET**: list all memos ordered by `created_at` desc. |
| `app/api/memos/[id]/route.ts` | **GET**: fetch single memo by ID. **DELETE**: delete from Supabase + Upstash Vector + Vercel Blob. |
| `app/api/search/route.ts` | **GET** `?q=`: embed query → Upstash topK=5 → fetch memo rows → Claude grounded answer. Returns `{answer, citations[]}`. |
| `app/api/translate/route.ts` | **POST** `{text, targetLang}`: calls `translateSegment()` via Claude. Returns `{translation}`. |
| `app/api/calendar/route.ts` | **POST** `{memoId, actionItemId, text, dueDate}`: creates a 1-hour Google Calendar event using a stored `GOOGLE_ACCESS_TOKEN`. Persists the event ID back to the action item in Supabase. |

### Components
| File | Purpose |
|------|---------|
| `components/Recorder.tsx` | Record button (FAB). Uses `MediaRecorder` API with `audio/webm`. On stop: assembles blob, POSTs to `/api/memos` as `FormData`. Shows recording/uploading/error states. |
| `components/TranscriptView.tsx` | Renders transcript segments. Each segment shows timestamp, `[KO]`/`[EN]` language badge (color-coded), segment text, and a translate button that calls `/api/translate` and shows translation inline below the segment. |
| `components/SummaryPanel.tsx` | Right-side panel: topics as badges, summary text, action items list. Each action item has a "+ Calendar" button that POSTs to `/api/calendar`. Shows "✓ Added to Calendar" link on success. |
| `components/MemoSidebar.tsx` | Left sidebar: list of memos (date, language chips, title). Highlights selected memo. Hosts the `Recorder` component at the bottom. |
| `components/SearchBar.tsx` | Top-bar search input. On Enter: GETs `/api/search`, shows a floating dropdown with the grounded answer and source citations. |

### App
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout. Sets metadata title/description. Geist font. **NOTE: Clerk `ClerkProvider` not yet added — must be done before running with auth.** |
| `app/page.tsx` | Main page. Loads memo list on mount, manages selected memo state. Renders `MemoSidebar` + `TranscriptView` + `SummaryPanel` in a 3-column layout. |

### Evals
| File | Purpose |
|------|---------|
| `evals/run-all.ts` | Orchestrator. Runs all 4 eval suites, prints a pass/fail table to stdout. Exits with code 1 if any suite fails (for CI). |
| `evals/wer.ts` | Word Error Rate against `evals/data/wer-testset.json`. Calls Whisper API on each audio file, computes WER with DP algorithm. Targets: EN < 10%, KO < 15%, mixed < 20%. |
| `evals/summary-judge.ts` | LLM-as-judge using Claude **Opus** to rate Claude **Sonnet** summaries on faithfulness/relevance/conciseness (1–5). Reads from `evals/data/summary-testset.json`. |
| `evals/action-item-eval.ts` | Precision/recall for action item extraction. Fuzzy word-overlap matching (50% threshold). Reads from `evals/data/action-item-testset.json`. |
| `evals/retrieval-eval.ts` | RAG retrieval quality: P@3, recall@5, MRR. Embeds test queries, runs vector search, compares against hand-curated relevant memo IDs in `evals/data/retrieval-testset.json`. |
| `evals/data/` | Empty — must be populated before running evals. See each eval file's JSDoc for the expected JSON format. |
