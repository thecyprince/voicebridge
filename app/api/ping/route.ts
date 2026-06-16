import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Lightweight query — just enough to keep Supabase from pausing
  await supabase.from("memos").select("id").limit(1);
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
