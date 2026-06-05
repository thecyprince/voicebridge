import { NextResponse } from "next/server";
import { google } from "googleapis";

// GET /api/calendar/connect
// Redirects the user to Google's OAuth consent screen.
// After approval, Google redirects to GOOGLE_REDIRECT_URI (/api/calendar/callback).
export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return refresh_token
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });

  return NextResponse.redirect(url);
}
