import { NextRequest, NextResponse } from "next/server";
import { getMemo, deleteMemo, updateMemoSegments } from "@/lib/supabase";
import { deleteByMemoId } from "@/lib/vector";
import { del } from "@vercel/blob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const memo = await getMemo(id);
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ memo });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const memo = await getMemo(id);
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { speaker, name } = await req.json();
  if (typeof speaker !== "number") {
    return NextResponse.json({ error: "speaker must be a number" }, { status: 400 });
  }

  const trimmed = typeof name === "string" ? name.trim() : "";
  const updated = memo.segments.map((seg) =>
    seg.speaker === speaker
      ? { ...seg, speakerName: trimmed || undefined }
      : seg,
  );

  await updateMemoSegments(id, updated);
  return NextResponse.json({ memo: { ...memo, segments: updated } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const memo = await getMemo(id);
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all([
    deleteMemo(id),
    deleteByMemoId(id),
    del(memo.audioUrl).catch(() => {}), // best-effort
  ]);

  return NextResponse.json({ success: true });
}
