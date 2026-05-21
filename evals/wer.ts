/**
 * evals/wer.ts — Word Error Rate evaluation for Whisper STT.
 *
 * Expects test data in evals/data/wer-testset.json:
 * [
 *   { "audioPath": "evals/data/audio/ko-01.webm", "groundTruth": "안녕하세요...", "lang": "ko" },
 *   { "audioPath": "evals/data/audio/en-01.webm", "groundTruth": "Hello...", "lang": "en" },
 *   ...
 * ]
 *
 * Populate evals/data/ with real audio files and ground truth before running.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import OpenAI from "openai";
import { createReadStream } from "fs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = reference.trim().split(/\s+/);
  const hyp = hypothesis.trim().split(/\s+/);

  // DP-based WER
  const dp: number[][] = Array.from({ length: ref.length + 1 }, (_, i) =>
    Array.from({ length: hyp.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= hyp.length; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[ref.length][hyp.length] / ref.length;
}

export async function runWER(): Promise<{ english: number; korean: number; mixed: number }> {
  const testsetPath = resolve("evals/data/wer-testset.json");

  if (!existsSync(testsetPath)) {
    console.warn("[WER] No testset found at evals/data/wer-testset.json — returning placeholder.");
    return { english: 0, korean: 0, mixed: 0 };
  }

  const testset: Array<{ audioPath: string; groundTruth: string; lang: "en" | "ko" | "mixed" }> =
    JSON.parse(readFileSync(testsetPath, "utf-8"));

  const rates: Record<string, number[]> = { en: [], ko: [], mixed: [] };

  for (const item of testset) {
    const absPath = resolve(item.audioPath);
    if (!existsSync(absPath)) {
      console.warn(`[WER] Skipping missing audio: ${absPath}`);
      continue;
    }

    const response = await client.audio.transcriptions.create({
      file: createReadStream(absPath) as any,
      model: "whisper-1",
      response_format: "text",
    });

    const wer = wordErrorRate(item.groundTruth, response as unknown as string);
    rates[item.lang]?.push(wer);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    english: avg(rates.en),
    korean: avg(rates.ko),
    mixed: avg(rates.mixed),
  };
}
