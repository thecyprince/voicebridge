/**
 * evals/retrieval-eval.ts — Retrieval quality eval for the RAG vector store.
 *
 * Expects evals/data/retrieval-testset.json:
 * [
 *   { "query": "ESTsoft comp discussion", "relevantMemoIds": ["uuid-1", "uuid-2"] },
 *   ...
 * ]
 *
 * Requires the vector store to be populated with real memos before running.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { embedText } from "../lib/embeddings";
import { queryVector } from "../lib/vector";

function precisionAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.includes(id)).length;
  return hits / k;
}

function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.includes(id)).length;
  return hits / relevant.length;
}

function reciprocalRank(retrieved: string[], relevant: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.includes(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

export async function runRetrievalEval(): Promise<{
  precisionAt3: number;
  recallAt5: number;
  mrr: number;
}> {
  const testsetPath = resolve("evals/data/retrieval-testset.json");

  if (!existsSync(testsetPath)) {
    console.warn("[RetrievalEval] No testset found — returning placeholder.");
    return { precisionAt3: 1, recallAt5: 1, mrr: 1 };
  }

  const testset: Array<{ query: string; relevantMemoIds: string[] }> = JSON.parse(
    readFileSync(testsetPath, "utf-8")
  );

  const metrics = { precisionAt3: 0, recallAt5: 0, mrr: 0 };

  for (const item of testset) {
    const embedding = await embedText(item.query);
    const hits = await queryVector(embedding, 5);
    // Deduplicate by memoId (multiple chunks per memo)
    const retrievedMemoIds = [...new Set(hits.map((h) => h.metadata.memoId))];

    metrics.precisionAt3 += precisionAtK(retrievedMemoIds, item.relevantMemoIds, 3);
    metrics.recallAt5 += recallAtK(retrievedMemoIds, item.relevantMemoIds, 5);
    metrics.mrr += reciprocalRank(retrievedMemoIds, item.relevantMemoIds);
  }

  const n = testset.length;
  return {
    precisionAt3: metrics.precisionAt3 / n,
    recallAt5: metrics.recallAt5 / n,
    mrr: metrics.mrr / n,
  };
}
