import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { queryVector } from "@/lib/vector";
import { getMemosByIds } from "@/lib/supabase";
import { answerFromMemos } from "@/lib/claude";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    // 1. Embed query
    const embedding = await embedText(query);

    // 2. Retrieve top-k chunks from vector store
    const hits = await queryVector(embedding, 5);
    if (hits.length === 0) {
      return NextResponse.json({
        answer: "No relevant memos found.",
        citations: [],
      });
    }

    // 3. Fetch full memo rows for context
    const memoIds = [...new Set(hits.map((h) => h.metadata.memoId))];
    const memos = await getMemosByIds(memoIds);
    const memoMap = new Map(memos.map((m) => [m.id, m]));

    // 4. Build context objects with memo titles
    const contexts = hits.map((h) => ({
      memoId: h.metadata.memoId,
      memoTitle: memoMap.get(h.metadata.memoId)?.title ?? h.metadata.memoId,
      excerpt: h.metadata.text,
    }));

    // 5. Grounded answer from Claude
    const result = await answerFromMemos(query, contexts);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/search]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
