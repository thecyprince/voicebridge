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

## Known Gaps (2026-05-21)

- `ClerkProvider` not yet added to `app/layout.tsx`
- Google OAuth callback route not implemented — Calendar needs manual `GOOGLE_ACCESS_TOKEN`
- `evals/data/` is empty — no testsets yet
- No mobile layout
