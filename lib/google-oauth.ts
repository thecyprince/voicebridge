import { google } from "googleapis";
import type { NextRequest } from "next/server";

// Server-only. Shared Google OAuth helpers for the calendar routes.

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
];

// Derive the OAuth redirect URI from the incoming request origin instead of a
// static env var. GOOGLE_REDIRECT_URI can't hold both the localhost value (dev)
// and the prod value at once — sync-secrets.sh copies Doppler-dev → Vercel-prod,
// so a single value always clobbers the other. Deriving from req.url keeps the
// /connect and /callback URIs identical (Google requires an exact match) in
// every environment with no env divergence.
export function calendarRedirectUri(req: NextRequest): string {
  return new URL("/api/calendar/callback", req.url).toString();
}

export function oauthClient(req: NextRequest) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    calendarRedirectUri(req),
  );
}
