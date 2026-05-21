import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { updateActionItemCalendarId } from "@/lib/supabase";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// GET /api/calendar?memoId=...&actionItemId=...&text=...&dueDate=...
// Creates a Google Calendar event and returns the event URL.
// Requires GOOGLE_ACCESS_TOKEN env var (set after OAuth callback).
export async function POST(req: NextRequest) {
  const { memoId, actionItemId, text, dueDate } = await req.json();

  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Calendar not connected. Set GOOGLE_ACCESS_TOKEN." },
      { status: 401 },
    );
  }

  try {
    const auth = getOAuthClient();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });

    const startDate = dueDate ? new Date(dueDate) : new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1hr

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: text,
        description: `Action item from voice memo`,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });

    const eventId = event.data.id!;
    const eventUrl = event.data.htmlLink!;

    // Persist the calendar event ID on the action item
    if (memoId && actionItemId) {
      await updateActionItemCalendarId(memoId, actionItemId, eventId);
    }

    return NextResponse.json({ eventId, eventUrl });
  } catch (err: any) {
    console.error("[POST /api/calendar]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
