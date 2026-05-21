import { NextRequest, NextResponse } from "next/server";
import { translateSegment } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json();
  if (!text || !targetLang) {
    return NextResponse.json({ error: "Missing text or targetLang" }, { status: 400 });
  }
  if (targetLang !== "en" && targetLang !== "ko") {
    return NextResponse.json({ error: "targetLang must be 'en' or 'ko'" }, { status: 400 });
  }

  try {
    const translation = await translateSegment(text, targetLang);
    return NextResponse.json({ translation });
  } catch (err: any) {
    console.error("[POST /api/translate]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
