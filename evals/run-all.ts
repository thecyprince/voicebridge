/**
 * evals/run-all.ts — Run all evaluation suites and print a summary table.
 *
 * Usage:
 *   npx tsx evals/run-all.ts
 *
 * Set OPENAI_API_KEY and ANTHROPIC_API_KEY in your env before running.
 */

import { runWER } from "./wer";
import { runSummaryJudge } from "./summary-judge";
import { runActionItemEval } from "./action-item-eval";
import { runRetrievalEval } from "./retrieval-eval";

async function main() {
  console.log("=== VoiceBridge — Eval Suite ===\n");

  const results: Array<{ name: string; pass: boolean; details: string }> = [];

  // 1. WER
  try {
    const wer = await runWER();
    results.push({
      name: "STT WER",
      pass: wer.english < 0.10 && wer.korean < 0.15 && wer.mixed < 0.20,
      details: `EN: ${(wer.english * 100).toFixed(1)}% | KO: ${(wer.korean * 100).toFixed(1)}% | MIXED: ${(wer.mixed * 100).toFixed(1)}%`,
    });
  } catch (e: any) {
    results.push({ name: "STT WER", pass: false, details: `ERROR: ${e.message}` });
  }

  // 2. Summary quality
  try {
    const summary = await runSummaryJudge();
    results.push({
      name: "Summary (LLM-as-judge)",
      pass: summary.faithfulness >= 4.5 && summary.relevance >= 4.0,
      details: `Faithfulness: ${summary.faithfulness.toFixed(2)}/5 | Relevance: ${summary.relevance.toFixed(2)}/5 | Conciseness: ${summary.conciseness.toFixed(2)}/5`,
    });
  } catch (e: any) {
    results.push({ name: "Summary (LLM-as-judge)", pass: false, details: `ERROR: ${e.message}` });
  }

  // 3. Action item extraction
  try {
    const ai = await runActionItemEval();
    results.push({
      name: "Action Item Extraction",
      pass: ai.precision >= 0.9 && ai.recall >= 0.7,
      details: `Precision: ${ai.precision.toFixed(2)} | Recall: ${ai.recall.toFixed(2)}`,
    });
  } catch (e: any) {
    results.push({ name: "Action Item Extraction", pass: false, details: `ERROR: ${e.message}` });
  }

  // 4. Retrieval
  try {
    const ret = await runRetrievalEval();
    results.push({
      name: "RAG Retrieval",
      pass: ret.precisionAt3 >= 0.7 && ret.mrr >= 0.6,
      details: `P@3: ${ret.precisionAt3.toFixed(2)} | MRR: ${ret.mrr.toFixed(2)} | R@5: ${ret.recallAt5.toFixed(2)}`,
    });
  } catch (e: any) {
    results.push({ name: "RAG Retrieval", pass: false, details: `ERROR: ${e.message}` });
  }

  // Print table
  console.log("┌─────────────────────────────┬────────┬──────────────────────────────────────────────────┐");
  console.log("│ Eval                        │ Status │ Details                                          │");
  console.log("├─────────────────────────────┼────────┼──────────────────────────────────────────────────┤");
  for (const r of results) {
    const name = r.name.padEnd(27);
    const status = r.pass ? "  ✅   " : "  ❌   ";
    const details = r.details.padEnd(48);
    console.log(`│ ${name} │ ${status} │ ${details} │`);
  }
  console.log("└─────────────────────────────┴────────┴──────────────────────────────────────────────────┘");

  const failed = results.filter((r) => !r.pass).length;
  if (failed > 0) {
    console.error(`\n${failed} eval(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll evals passed ✅");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
