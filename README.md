# Korean Voice Memo

Bilingual Korean+English AI voice memo assistant. Record a memo in Korean, English, or both — get a transcript with per-segment language tags, an LLM summary, extracted action items you can add to Google Calendar, and a semantic search bar to ask questions across all your past memos.

**Live demo:** (coming soon — deploy to Vercel)

## Features

- **Bilingual STT** — OpenAI Whisper handles Korean, English, and code-switched audio natively
- **Per-segment language tagging** — each transcript segment is tagged `[KO]` or `[EN]` with one-tap translation
- **AI summary + action items** — Claude Sonnet extracts a summary and concrete TODOs via structured tool use
- **Google Calendar integration** — one-click to add any action item as a calendar event
- **Semantic search** — ask questions across all your memos; answers are grounded in retrieved excerpts with citations (RAG)
- **Eval harness** — WER, LLM-as-judge, action item precision/recall, retrieval P@3/MRR — CI blocks regressions

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui |
| STT | OpenAI Whisper API |
| LLM | Claude Sonnet 4.6 (Anthropic SDK, prompt caching) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector store | Upstash Vector |
| Database | Supabase Postgres |
| Audio storage | Vercel Blob |
| Auth | Clerk |
| Calendar | Google Calendar API v3 |
| Deploy | Vercel |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/thecyprince/korean-voice-memo
cd korean-voice-memo
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
# Fill in all values — see .env.example for instructions
```

You'll need accounts for: OpenAI, Anthropic, Upstash, Supabase, Vercel, Clerk, and Google Cloud (Calendar API).

### 3. Create the Supabase table

Run `supabase/schema.sql` in the Supabase SQL editor.

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Evals

```bash
# Populate evals/data/ with audio files + ground truth first (see evals/*.ts for format)
npm run evals
```

| Eval | Target |
|------|--------|
| STT WER (English) | < 10% |
| STT WER (Korean) | < 15% |
| STT WER (code-switched) | < 20% |
| Summary faithfulness | ≥ 4.5/5 |
| Summary relevance | ≥ 4.0/5 |
| Action item precision | ≥ 0.90 |
| Action item recall | ≥ 0.70 |
| Retrieval P@3 | ≥ 0.70 |
| Retrieval MRR | ≥ 0.60 |

## Deploy

```bash
vercel --prod
# Set all env vars in the Vercel dashboard
```
