# Graph Report - .  (2026-05-29)

## Corpus Check
- Corpus is ~11,157 words - fits in a single context window. You may not need a graph.

## Summary
- 248 nodes · 417 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.9)
- Token cost: 18,000 input · 4,500 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Memo Ingestion & Recording|Memo Ingestion & Recording]]
- [[_COMMUNITY_UI Display & Formatting|UI Display & Formatting]]
- [[_COMMUNITY_Component Path Aliases|Component Path Aliases]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Dev & Build Toolchain|Dev & Build Toolchain]]
- [[_COMMUNITY_RAG Search & Retrieval|RAG Search & Retrieval]]
- [[_COMMUNITY_Shadcn UI Primitives|Shadcn UI Primitives]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Eval Suite|Eval Suite]]
- [[_COMMUNITY_Calendar & Memo Detail|Calendar & Memo Detail]]
- [[_COMMUNITY_Translation & Claude LLM|Translation & Claude LLM]]
- [[_COMMUNITY_App Layout & Fonts|App Layout & Fonts]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 20 edges
2. `compilerOptions` - 16 edges
3. `Memo` - 12 edges
4. `summarizeMemo()` - 11 edges
5. `answerFromMemos()` - 10 edges
6. `getMemo()` - 10 edges
7. `embedText()` - 9 edges
8. `queryVector()` - 9 edges
9. `runRetrievalEval()` - 8 edges
10. `transcribeAudio()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --semantically_similar_to--> `Forced Tool Choice for Structured Output`  [AMBIGUOUS] [semantically similar]
  app/layout.tsx → lib/claude.ts
- `RAG Pipeline` --references--> `answerFromMemos()`  [INFERRED]
  CLAUDE_REFERENCE.md → lib/claude.ts
- `RAG Pipeline` --references--> `embedText()`  [INFERRED]
  CLAUDE_REFERENCE.md → lib/embeddings.ts
- `RAG Pipeline` --references--> `queryVector()`  [INFERRED]
  CLAUDE_REFERENCE.md → lib/vector.ts
- `RAG Pipeline` --references--> `GET /api/search`  [INFERRED]
  CLAUDE_REFERENCE.md → app/api/search/route.ts

## Hyperedges (group relationships)
- **Full audio ingestion pipeline: Whisper STT → Claude summary → embedBatch → upsertChunks → saveMemo** — api_memos_route_post, lib_whisper_transcribeaudio, lib_claude_summarizememo, lib_embeddings_embedbatch, lib_vector_upsertchunks, lib_supabase_savememo [EXTRACTED 1.00]
- **RAG search pipeline: embedText → queryVector → getMemosByIds → answerFromMemos** — api_search_route_get, lib_embeddings_embedtext, lib_vector_queryvector, lib_supabase_getmemosbyids, lib_claude_answerfrommemos [EXTRACTED 1.00]
- **Eval suite covering all quality dimensions: WER, summary judge, action items, retrieval** — evals_runall_main, evals_wer_runwer, evals_summaryjudge_runsummaryjudge, evals_actionitemeval_runactionitemeval, evals_retrievaleval_runretrievaleval [EXTRACTED 1.00]

## Communities (17 total, 3 thin omitted)

### Community 0 - "Memo Ingestion & Recording"
Cohesion: 0.12
Nodes (27): GET /api/memos, POST /api/memos, Recorder(), Audio Ingestion Pipeline, Forced Tool Choice for Structured Output, Per-segment Language Detection via Regex, buildChunk(), Chunk (+19 more)

### Community 1 - "UI Display & Formatting"
Cohesion: 0.15
Nodes (20): fmtDuration(), Home(), LANG_CHIP, MemoSidebar(), MemoSidebarProps, RecorderProps, State, SearchBar() (+12 more)

### Community 2 - "Component Path Aliases"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @anthropic-ai/sdk, @base-ui/react, class-variance-authority, @clerk/nextjs, clsx, googleapis, lucide-react (+13 more)

### Community 4 - "Dev & Build Toolchain"
Cohesion: 0.10
Nodes (20): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/react (+12 more)

### Community 5 - "RAG Search & Retrieval"
Cohesion: 0.21
Nodes (17): GET /api/search, Prompt Caching (cache_control ephemeral), RAG Pipeline, precisionAtK(), recallAtK(), reciprocalRank(), runRetrievalEval(), runRetrievalEval (+9 more)

### Community 6 - "Shadcn UI Primitives"
Cohesion: 0.19
Nodes (14): cn(), Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+6 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Eval Suite"
Cohesion: 0.17
Nodes (14): LLM-as-Judge Eval Pattern, isMatch(), normalize(), runActionItemEval(), runActionItemEval, main(), evals main orchestrator, client (+6 more)

### Community 9 - "Calendar & Memo Detail"
Cohesion: 0.21
Nodes (14): POST /api/calendar, DELETE /api/memos/[id], GET /api/memos/[id], getOAuthClient(), POST(), Chunk ID Convention {memoId}_{index}, DELETE(), GET() (+6 more)

### Community 10 - "Translation & Claude LLM"
Cohesion: 0.22
Nodes (9): POST /api/translate, client, translateSegment(), buildTranslatePrompt, buildGroundedAnswerPrompt(), buildSummarizePrompt(), summarizeTool, buildTranslatePrompt() (+1 more)

### Community 11 - "App Layout & Fonts"
Cohesion: 0.40
Nodes (4): geistMono, geistSans, metadata, RootLayout()

## Ambiguous Edges - Review These
- `RootLayout()` → `Forced Tool Choice for Structured Output`  [AMBIGUOUS]
  app/layout.tsx · relation: semantically_similar_to

## Knowledge Gaps
- **101 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `RootLayout()` and `Forced Tool Choice for Structured Output`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `cn()` connect `Shadcn UI Primitives` to `UI Display & Formatting`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `summarizeMemo()` connect `Memo Ingestion & Recording` to `UI Display & Formatting`, `Translation & Claude LLM`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Memo` connect `UI Display & Formatting` to `Memo Ingestion & Recording`, `Calendar & Memo Detail`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Memo Ingestion & Recording` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._
- **Should `UI Display & Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.14532019704433496 - nodes in this community are weakly interconnected._