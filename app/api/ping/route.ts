import { supabase } from "@/lib/supabase";
import { Index } from "@upstash/vector";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const [supabaseResult, vectorResult] = await Promise.allSettled([
    supabase.from("heartbeat").upsert({ id: "default", pinged_at: new Date().toISOString() }),
    new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    }).info(),
  ]);

  // A settled promise only means the request didn't throw — Supabase writes
  // resolve normally even when rejected (e.g. table missing, RLS denial), so
  // the inner `error` field must be checked too or failures go unreported.
  const supabaseOk =
    supabaseResult.status === "fulfilled" && !supabaseResult.value.error;
  const ok = supabaseOk && vectorResult.status === "fulfilled";

  return NextResponse.json(
    {
      ok,
      ts: new Date().toISOString(),
      supabase: supabaseOk
        ? "fulfilled"
        : supabaseResult.status === "fulfilled"
          ? `error: ${supabaseResult.value.error!.message}`
          : `rejected: ${supabaseResult.reason}`,
      vector: vectorResult.status,
    },
    { status: ok ? 200 : 503 },
  );
}
