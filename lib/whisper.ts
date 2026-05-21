import OpenAI from "openai";
import { Language, TranscriptSegment } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function detectLanguage(langCode: string | null | undefined): Language {
  if (!langCode) return "unknown";
  const code = langCode.toLowerCase();
  if (code === "ko" || code === "korean") return "ko";
  if (code === "en" || code === "english") return "en";
  return "unknown";
}

export async function transcribeAudio(audioBlob: Blob): Promise<{
  segments: TranscriptSegment[];
  detectedLanguages: Language[];
  durationSeconds: number;
}> {
  const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

  const response = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const rawSegments = (response as any).segments ?? [];

  // Whisper returns one language for the whole file; segment-level language
  // is inferred from the top-level language field for now (Whisper API v1
  // limitation). We mark segments as the file language unless the transcript
  // contains Korean characters (strong signal of code-switching).
  const fileLanguage = detectLanguage((response as any).language);

  const segments: TranscriptSegment[] = rawSegments.map(
    (seg: any, idx: number) => {
      const hasKorean = /[가-힣]/.test(seg.text);
      const hasLatin = /[a-zA-Z]{2,}/.test(seg.text);
      let lang: Language = fileLanguage;
      if (hasKorean && hasLatin) lang = "mixed";
      else if (hasKorean) lang = "ko";
      else if (hasLatin && fileLanguage === "ko") lang = "en";

      return {
        id: idx,
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
        language: lang,
      };
    }
  );

  const detectedLanguages = [...new Set(segments.map((s) => s.language))].filter(
    (l) => l !== "unknown"
  ) as Language[];

  const durationSeconds =
    rawSegments.length > 0
      ? rawSegments[rawSegments.length - 1].end
      : (response as any).duration ?? 0;

  return { segments, detectedLanguages, durationSeconds };
}
