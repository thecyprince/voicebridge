import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/calendar/status
// Reports whether Google Calendar is connected (a refresh token is stored).
export async function GET() {
  const { data } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("id", "default")
    .single();

  return NextResponse.json({ connected: Boolean(data?.refresh_token) });
}
