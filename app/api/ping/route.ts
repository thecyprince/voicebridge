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

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    supabase: supabaseResult.status,
    vector: vectorResult.status,
  });
}
