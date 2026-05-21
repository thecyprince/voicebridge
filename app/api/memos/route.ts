import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { transcribeAudio } from "@/lib/whisper";
import { summarizeMemo } from "@/lib/claude";
import { embedBatch } from "@/lib/embeddings";
import { chunkTranscript } from "@/lib/chunker";
import { upsertChunks } from "@/lib/vector";
import { saveMemo, listMemos } from "@/lib/supabase";
import { Memo } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const memoId = crypto.randomUUID();

    // 1. Upload audio to Vercel Blob
    const blob = await put(`memos/${memoId}.webm`, audioFile, {
      access: "public",
    });

    // 2. Transcribe with Whisper
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type,
    });
    const { segments, detectedLanguages, durationSeconds } =
      await transcribeAudio(audioBlob);

    // 3. Summarize + extract action items with Claude
    const { title, summary, topics, actionItems } = await summarizeMemo(segments);

    // 4. Chunk transcript, embed, and upsert to vector store
    const chunks = chunkTranscript(segments);
    const embeddings = await embedBatch(chunks.map((c) => c.text));
    await upsertChunks(
      memoId,
      chunks.map((c, i) => ({
        text: c.text,
        startTime: c.startTime,
        endTime: c.endTime,
        embedding: embeddings[i],
      })),
    );

    // 5. Save to Supabase
    const memo: Memo = {
      id: memoId,
      title,
      createdAt: new Date().toISOString(),
      audioUrl: blob.url,
      durationSeconds,
      languages: detectedLanguages,
      segments,
      summary,
      topics,
      actionItems,
    };
    await saveMemo(memo);

    return NextResponse.json({ memo });
  } catch (err: any) {
    console.error("[POST /api/memos]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const memos = await listMemos();
    return NextResponse.json({ memos });
  } catch (err: any) {
    console.error("[GET /api/memos]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
