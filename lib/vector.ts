import { Index } from "@upstash/vector";

function getIndex() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });
}

export interface VectorRecord {
  memoId: string;
  chunkIndex: number;
  text: string;
  startTime: number;
  endTime: number;
}

export async function upsertChunks(
  memoId: string,
  chunks: Array<{ text: string; startTime: number; endTime: number; embedding: number[] }>,
) {
  const vectors = chunks.map((chunk, i) => ({
    id: `${memoId}_${i}`,
    vector: chunk.embedding,
    metadata: {
      memoId,
      chunkIndex: i,
      text: chunk.text,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
    } satisfies VectorRecord,
  }));

  await getIndex().upsert(vectors);
}

export async function queryVector(
  embedding: number[],
  topK = 5,
): Promise<Array<{ score: number; metadata: VectorRecord }>> {
  const results = await getIndex().query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return results.map((r) => ({
    score: r.score,
    metadata: r.metadata as unknown as VectorRecord,
  }));
}

export async function deleteByMemoId(memoId: string) {
  // Upstash Vector doesn't support filter-delete; we fetch all and delete by ID prefix convention
  // For MVP: delete individual chunk IDs up to a reasonable max count
  const ids = Array.from({ length: 50 }, (_, i) => `${memoId}_${i}`);
  await getIndex().delete(ids);
}
