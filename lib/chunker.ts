import { TranscriptSegment } from "@/types";

const CHUNK_TOKEN_TARGET = 400;
// Rough approximation: 1 token ≈ 4 chars for English, ~2 chars for Korean
function roughTokenCount(text: string): number {
  const koreanChars = (text.match(/[가-힣]/g) ?? []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars / 2 + otherChars / 4);
}

export interface Chunk {
  text: string;
  startSegment: number;
  endSegment: number;
  startTime: number;
  endTime: number;
}

export function chunkTranscript(segments: TranscriptSegment[]): Chunk[] {
  const chunks: Chunk[] = [];
  let current: TranscriptSegment[] = [];
  let tokenCount = 0;

  for (const seg of segments) {
    const segTokens = roughTokenCount(seg.text);
    if (tokenCount + segTokens > CHUNK_TOKEN_TARGET && current.length > 0) {
      chunks.push(buildChunk(current));
      // 1-segment overlap for context continuity
      current = [current[current.length - 1], seg];
      tokenCount = roughTokenCount(current[0].text) + segTokens;
    } else {
      current.push(seg);
      tokenCount += segTokens;
    }
  }

  if (current.length > 0) {
    chunks.push(buildChunk(current));
  }

  return chunks;
}

function buildChunk(segs: TranscriptSegment[]): Chunk {
  return {
    text: segs.map((s) => s.text).join(" "),
    startSegment: segs[0].id,
    endSegment: segs[segs.length - 1].id,
    startTime: segs[0].start,
    endTime: segs[segs.length - 1].end,
  };
}
