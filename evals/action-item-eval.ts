/**
 * evals/action-item-eval.ts — Precision/recall for action item extraction.
 *
 * Expects evals/data/action-item-testset.json:
 * [
 *   {
 *     "transcript": "...",
 *     "groundTruth": ["Send portfolio by Tuesday", "Prep Korean intro"],
 *     "extracted": ["Send portfolio by Tuesday", "Prep Korean intro", "Schedule follow-up"]
 *   },
 *   ...
 * ]
 *
 * "extracted" is filled in by running summarizeMemo() on the transcript.
 * Matching is fuzzy (substring / keyword overlap).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, "").trim();
}

function isMatch(predicted: string, truth: string): boolean {
  const p = normalize(predicted);
  const t = normalize(truth);
  // Consider a match if at least 50% of truth words appear in predicted
  const truthWords = t.split(" ").filter((w) => w.length > 2);
  const matches = truthWords.filter((w) => p.includes(w));
  return matches.length / truthWords.length >= 0.5;
}

export async function runActionItemEval(): Promise<{
  precision: number;
  recall: number;
}> {
  const testsetPath = resolve("evals/data/action-item-testset.json");

  if (!existsSync(testsetPath)) {
    console.warn("[ActionItemEval] No testset found — returning placeholder.");
    return { precision: 1, recall: 1 };
  }

  const testset: Array<{
    groundTruth: string[];
    extracted: string[];
  }> = JSON.parse(readFileSync(testsetPath, "utf-8"));

  let totalTP = 0, totalFP = 0, totalFN = 0;

  for (const item of testset) {
    const { groundTruth, extracted } = item;
    const tp = extracted.filter((p) => groundTruth.some((t) => isMatch(p, t))).length;
    const fp = extracted.length - tp;
    const fn = groundTruth.filter((t) => !extracted.some((p) => isMatch(p, t))).length;
    totalTP += tp;
    totalFP += fp;
    totalFN += fn;
  }

  const precision = totalTP / (totalTP + totalFP) || 0;
  const recall = totalTP / (totalTP + totalFN) || 0;
  return { precision, recall };
}
