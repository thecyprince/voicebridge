# Korean Voice Memo — Full Reference

> Detailed reference for Eric and Claude. Read on demand — not loaded every session.
> Update this file when architecture, files, or setup steps change.

---

## What This Project Does

Record a voice memo (Korean, English, or mixed) → get a transcript with per-segment language tags → Claude summary + action items → one-click Google Calendar events → semantic search across all past memos (RAG).

**Why it exists:** Eric's portfolio project demonstrating STT, RAG, LLM tool use, agent patterns, and evals — for AI-adjacent job applications (TAM, SE, FDE, AI PM). Bilingual Korean+English is the differentiator.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui |
| STT | OpenAI Whisper API (`whisper-1`, `verbose_json`) |
| LLM | Claude Sonnet 4.6 — summarization, RAG answers, translation |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim, multilingual) |
| Vector DB | Upstash Vector (serverless, cosine metric) |
| Database | Supabase Postgres (memo rows, JSONB for segments + action items) |
| Audio storage | Vercel Blob (signed public URLs) |
| Auth | Clerk (not yet wired — see Known Gaps) |
| Calendar | Google Calendar API v3 (`googleapis` npm) |
| Deploy | Vercel |

---

## Project Structure

```
korean-voice-memo/
├── app/
│   ├── api/
│   │   ├── memos/route.ts          # POST (full pipeline) + GET (list)
│   │   ├── memos/[id]/route.ts     # GET + DELETE single memo
│   │   ├── search/route.ts         # GET ?q= — RAG search
│   │   ├── translate/route.ts      # POST — segment translation
│   │   └── calendar/route.ts       # POST — create Calendar event
│   ├── layout.tsx                  # Root layout (Clerk not yet wired)
│   └── page.tsx                    # Main app shell
├── components/
│   ├── Recorder.tsx                # Record button + MediaRecorder
│   ├── TranscriptView.tsx          # Segments + language tags + translate
│   ├── SummaryPanel.tsx            # Summary + action items + calendar
│   ├── MemoSidebar.tsx             # Left sidebar + Recorder
│   ├── SearchBar.tsx               # RAG search input + results dropdown
│   └── ui/                         # shadcn/ui primitives (auto-generated)
├── lib/                            # Server-side only — never import in client components
│   ├── whisper.ts                  # Whisper wrapper + per-segment language detection
│   ├── claude.ts                   # summarizeMemo · answerFromMemos · translateSegment
│   ├── embeddings.ts               # embedText · embedBatch
│   ├── chunker.ts                  # ~400-token chunks with 1-segment overlap
│   ├── vector.ts                   # Upstash upsert · query · delete
│   ├── supabase.ts                 # Memo CRUD (service role, server-only)
│   └── prompts/
│       ├── summarize.ts            # Tool schema + system prompt
│       ├── grounded-answer.ts      # RAG answer prompt with citation rules
│       └── translate.ts            # Translation prompt builder
├── types/index.ts                  # Memo · TranscriptSegment · ActionItem · SearchResult
├── evals/
│   ├── run-all.ts                  # Orchestrator — pass/fail table, exits 1 on failure
│   ├── wer.ts                      # Word Error Rate (EN < 10%, KO < 15%, mixed < 20%)
│   ├── summary-judge.ts            # Claude Opus judges Sonnet summaries (faithfulness ≥ 4.5)
│   ├── action-item-eval.ts         # Precision ≥ 0.9, recall ≥ 0.7
│   ├── retrieval-eval.ts           # P@3 ≥ 0.7, MRR ≥ 0.6
│   └── data/                       # Testset JSON files + audio (audio gitignored)
├── supabase/schema.sql             # Run once in Supabase SQL editor
├── CLAUDE.md                       # Short Claude instructions (loaded every session)
├── CLAUDE_REFERENCE.md             # This file — full reference (read on demand)
├── HANDOFF.md                      # Session handoff log
├── README.md                       # Public-facing docs
└── .env.example                    # All required env vars
```

---

## File Descriptions

### API Routes

**`app/api/memos/route.ts`** — Core pipeline.
POST: upload audio → Vercel Blob → Whisper transcription → Claude tool-use summary → embed chunks → upsert Upstash Vector → save Supabase row → return `Memo`.
GET: list all memos ordered by `created_at` desc.

**`app/api/memos/[id]/route.ts`**
GET: single memo. DELETE: removes from Supabase + Upstash Vector (up to 50 chunks) + Vercel Blob.

**`app/api/search/route.ts`**
Embeds query → Upstash topK=5 → fetch memo rows by ID → Claude grounded answer with citations → `{answer, citations[]}`.

**`app/api/translate/route.ts`**
POST `{text, targetLang: "en"|"ko"}` → Claude → `{translation}`.

**`app/api/calendar/route.ts`**
POST `{memoId, actionItemId, text, dueDate}` → creates 1-hour Google Calendar event → persists `calendarEventId` back to action item in Supabase. Requires `GOOGLE_ACCESS_TOKEN` env var.

### Library

**`lib/whisper.ts`**
Whisper v1 returns one language per file, not per segment. Per-segment language is inferred via regex: `[가-힣]` present + Latin chars → `mixed`; only Korean → `ko`; falls back to file-level language otherwise.

**`lib/claude.ts`**
- `summarizeMemo(segments)` — forced tool choice (`extract_memo_info`) → `{title, summary, topics, actionItems[]}`
- `answerFromMemos(query, contexts)` — RAG answer with `cache_control: ephemeral` on system prompt (~70% cost reduction on repeated queries)
- `translateSegment(text, targetLang)` — simple translation

**`lib/chunker.ts`**
~400-token target. Korean ≈ 2 chars/token, Latin ≈ 4 chars/token. 1-segment overlap between chunks for retrieval continuity.

**`lib/vector.ts`**
Chunk IDs: `{memoId}_{index}`. `deleteByMemoId()` deletes IDs 0–49 (sufficient for any realistic memo).

**`lib/supabase.ts`**
Service role key — server-side only. `updateActionItemCalendarId()` does read-modify-write on JSONB `action_items`.

**`lib/prompts/summarize.ts`**
Tool schema: required `title`, `summary`, `topics[]`, `action_items[{text, due_date?}]`. Tool choice forced to `extract_memo_info` — do not change to auto.

### Components

**`Recorder.tsx`** — `MediaRecorder` (audio/webm, 250ms chunks). States: idle → recording → uploading → idle/error. POSTs blob as FormData.

**`TranscriptView.tsx`** — Segments with timestamp, `[KO]`/`[EN]` color badge, text. Translate button calls `/api/translate` inline.

**`SummaryPanel.tsx`** — Topics badges, summary, action items. `+ Calendar` button POSTs to `/api/calendar`, shows `✓ Added to Calendar` link on success.

**`MemoSidebar.tsx`** — Memo list (date, language chips, title). Blue left border on selected. Hosts `Recorder` at bottom.

**`SearchBar.tsx`** — Enter fires `/api/search`. Floating dropdown with answer + source citations. ✕ to dismiss.

### Evals

All evals gracefully skip if their testset file doesn't exist (returns placeholder passing values). Populate `evals/data/` before running for real results. See each file's JSDoc for testset format.

| Eval | Target |
|------|--------|
| WER English | < 10% |
| WER Korean | < 15% |
| WER code-switched | < 20% |
| Summary faithfulness | ≥ 4.5 / 5 |
| Summary relevance | ≥ 4.0 / 5 |
| Action item precision | ≥ 0.90 |
| Action item recall | ≥ 0.70 |
| Retrieval P@3 | ≥ 0.70 |
| Retrieval MRR | ≥ 0.60 |

---

## Architecture: Data Flow

```
Browser mic
  └─ MediaRecorder (webm) ──► POST /api/memos
                                  ├─ Vercel Blob (audio storage)
                                  ├─ Whisper API (transcript + segments)
                                  ├─ Claude tool use (summary + action items)
                                  ├─ embedBatch → Upstash Vector (RAG index)
                                  └─ Supabase (memo row)

Search
  └─ GET /api/search?q=
        ├─ embedText(query)
        ├─ Upstash topK=5
        ├─ Supabase getMemosByIds
        └─ Claude answerFromMemos (prompt cached) → {answer, citations[]}

Translate
  └─ POST /api/translate → Claude → translation string

Calendar
  └─ POST /api/calendar → Google Calendar API → eventUrl + persist to Supabase
```

---

## Setup Instructions

### First-Time Setup

1. **Install**
   ```bash
   cd ~/Projects/korean-voice-memo && npm install
   ```

2. **Create external services** (~1 hour):
   - **Supabase** — new project → SQL editor → run `supabase/schema.sql`
   - **Upstash** — new Vector index: dimensions **1536**, metric **cosine**
   - **Vercel** — new Blob store (or `vercel link` auto-provisions)
   - **Clerk** — new application → publishable key + secret key
   - **Google Cloud** — enable Calendar API → OAuth 2.0 credentials (Web app) → add redirect URI `http://localhost:3000/api/calendar/callback`

3. **Environment**
   ```bash
   cp .env.example .env.local
   # Fill in all values
   ```

4. **Wire Clerk** into `app/layout.tsx`:
   ```tsx
   import { ClerkProvider } from '@clerk/nextjs'
   // Wrap <html> in <ClerkProvider>
   ```

5. **Run**
   ```bash
   npm run dev   # http://localhost:3000
   ```

6. **Smoke test** — record a 30s Korean+English memo, verify transcript + summary appear.

### Deploy

```bash
vercel --prod
# Mirror all .env.local vars in Vercel dashboard
```

---

## Sessions Log

| Date | Summary |
|------|---------|
| 2026-05-21 | Initial scaffold — Next.js 15, all lib/API/component/eval files written. TypeScript clean. No services connected yet. |

*(Append a row at the end of each work session.)*
