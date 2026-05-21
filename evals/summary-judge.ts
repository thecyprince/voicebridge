/**
 * evals/summary-judge.ts — LLM-as-judge evaluation for Claude summary quality.
 *
 * Expects evals/data/summary-testset.json:
 * [
 *   { "transcript": "...", "summary": "..." },
 *   ...
 * ]
 *
 * Uses Claude Opus as judge to rate Sonnet's summaries on 3 dimensions.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JUDGE_SYSTEM = `You are an expert evaluator for AI-generated summaries of voice memos.
You will be given a transcript and a summary. Rate the summary on three dimensions from 1 to 5:
- faithfulness: Does the summary accurately represent the transcript without hallucinations?
- relevance: Does the summary capture the key points?
- conciseness: Is the summary appropriately brief without losing important information?
Respond with ONLY a JSON object: {"faithfulness": X, "relevance": X, "conciseness": X}`;

async function judgeOne(transcript: string, summary: string) {
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 64,
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Transcript:\n${transcript}\n\nSummary:\n${summary}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("")
    .trim();

  return JSON.parse(text) as { faithfulness: number; relevance: number; conciseness: number };
}

export async function runSummaryJudge(): Promise<{
  faithfulness: number;
  relevance: number;
  conciseness: number;
}> {
  const testsetPath = resolve("evals/data/summary-testset.json");

  if (!existsSync(testsetPath)) {
    console.warn("[SummaryJudge] No testset found — returning placeholder.");
    return { faithfulness: 0, relevance: 0, conciseness: 0 };
  }

  const testset: Array<{ transcript: string; summary: string }> = JSON.parse(
    readFileSync(testsetPath, "utf-8")
  );

  const scores = { faithfulness: 0, relevance: 0, conciseness: 0 };

  for (const item of testset) {
    const result = await judgeOne(item.transcript, item.summary);
    scores.faithfulness += result.faithfulness;
    scores.relevance += result.relevance;
    scores.conciseness += result.conciseness;
  }

  const n = testset.length;
  return {
    faithfulness: scores.faithfulness / n,
    relevance: scores.relevance / n,
    conciseness: scores.conciseness / n,
  };
}
