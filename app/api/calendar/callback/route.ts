import { NextRequest, NextResponse } from "next/server";
import { oauthClient } from "@/lib/google-oauth";
import { supabase } from "@/lib/supabase";

// GET /api/calendar/callback?code=...
// Called by Google after the user grants Calendar access.
// Exchanges the code for tokens and persists the refresh token to Supabase.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[calendar/callback] OAuth error:", error);
    return NextResponse.redirect(new URL("/?calendar=error", req.url));
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    // Must use the same redirect URI that /connect sent to Google.
    const { tokens } = await oauthClient(req).getToken(code);

    // Upsert tokens into Supabase (single row, id = "default")
    const { error: dbErr } = await supabase.from("google_tokens").upsert({
      id: "default",
      refresh_token: tokens.refresh_token ?? null,
      access_token: tokens.access_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      updated_at: new Date().toISOString(),
    });

    if (dbErr) {
      console.error("[calendar/callback] Supabase upsert failed:", dbErr.message);
      // Non-fatal: the static env var fallback will still work
    }

    return NextResponse.redirect(new URL("/?calendar=connected", req.url));
  } catch (err: any) {
    console.error("[calendar/callback]", err);
    return NextResponse.redirect(new URL("/?calendar=error", req.url));
  }
}
