import { NextRequest, NextResponse } from "next/server";
import { oauthClient, CALENDAR_SCOPES } from "@/lib/google-oauth";

// GET /api/calendar/connect
// Redirects the user to Google's OAuth consent screen.
// After approval, Google redirects to <origin>/api/calendar/callback.
export async function GET(req: NextRequest) {
  const url = oauthClient(req).generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return refresh_token
    scope: CALENDAR_SCOPES,
  });

  return NextResponse.redirect(url);
}
