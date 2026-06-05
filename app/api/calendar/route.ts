import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase, updateActionItemCalendarId } from "@/lib/supabase";

async function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  // Prefer stored refresh token (set via OAuth callback)
  const { data } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (data?.refresh_token) {
    oauth2Client.setCredentials({
      refresh_token: data.refresh_token,
      access_token: data.access_token ?? undefined,
      expiry_date: data.expiry_date ?? undefined,
    });
    // Auto-refresh will happen transparently
    return oauth2Client;
  }

  // Fallback: static access token from environment (manual setup path)
  const staticToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (staticToken) {
    oauth2Client.setCredentials({ access_token: staticToken });
    return oauth2Client;
  }

  throw new Error(
    "Google Calendar not connected. Visit /api/calendar/connect to authorize.",
  );
}

export async function POST(req: NextRequest) {
  const { memoId, actionItemId, text, dueDate } = await req.json();

  try {
    const auth = await getAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    const startDate = dueDate ? new Date(dueDate) : new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hr

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: text,
        description: "Action item from VoiceBridge voice memo",
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });

    const eventId = event.data.id!;
    const eventUrl = event.data.htmlLink!;

    if (memoId && actionItemId) {
      await updateActionItemCalendarId(memoId, actionItemId, eventId);
    }

    return NextResponse.json({ eventId, eventUrl });
  } catch (err: any) {
    console.error("[POST /api/calendar]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
