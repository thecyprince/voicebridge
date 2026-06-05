import { Language, TranscriptSegment } from "@/types";

const GLADIA_API = "https://api.gladia.io/v2";

function detectLanguage(langCode: string | null | undefined): Language {
  if (!langCode) return "unknown";
  const code = langCode.toLowerCase();
  if (code === "ko" || code === "korean") return "ko";
  if (code === "en" || code === "english") return "en";
  return "unknown";
}

export async function transcribeAudio(audioUrl: string): Promise<{
  segments: TranscriptSegment[];
  detectedLanguages: Language[];
  durationSeconds: number;
}> {
  const apiKey = process.env.GLADIA_API_KEY;
  if (!apiKey) throw new Error("GLADIA_API_KEY is not set");

  // 1. Submit transcription job (Gladia accepts a public URL directly)
  const jobRes = await fetch(`${GLADIA_API}/pre-recorded`, {
    method: "POST",
    headers: {
      "x-gladia-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      diarization: true,
      language_config: {
        languages: ["ko", "en"],
        code_switching: true,
      },
    }),
  });

  if (!jobRes.ok) {
    const body = await jobRes.text();
    throw new Error(`Gladia job creation failed: ${jobRes.status} ${body}`);
  }

  const job = await jobRes.json();
  const resultUrl: string = job.result_url;
  if (!resultUrl) throw new Error("Gladia returned no result_url");

  // 2. Poll until done (~2s intervals, 90s hard cap)
  const deadline = Date.now() + 90_000;
  let result: any = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(resultUrl, {
      headers: { "x-gladia-key": apiKey },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    if (data.status === "done") {
      result = data.result;
      break;
    }
    if (data.status === "error") {
      throw new Error(`Gladia transcription error: ${JSON.stringify(data)}`);
    }
  }

  if (!result) throw new Error("Gladia transcription timed out after 90s");

  // 3. Map Gladia utterances → TranscriptSegment[]
  const utterances: any[] = result.transcription?.utterances ?? [];

  const segments: TranscriptSegment[] = utterances.map((u: any, idx: number) => {
    const text = (u.text ?? "").trim();
    const hasKorean = /[가-힣]/.test(text);
    const hasLatin = /[a-zA-Z]{2,}/.test(text);

    let lang = detectLanguage(u.language);
    if (hasKorean && hasLatin) lang = "mixed";
    else if (hasKorean) lang = "ko";
    else if (hasLatin && lang === "unknown") lang = "en";

    return {
      id: idx,
      start: u.start ?? 0,
      end: u.end ?? 0,
      text,
      language: lang,
      speaker: u.speaker ?? 0,
    };
  });

  const detectedLanguages = [
    ...new Set(segments.map((s) => s.language)),
  ].filter((l) => l !== "unknown") as Language[];

  const durationSeconds =
    segments.length > 0
      ? segments[segments.length - 1].end
      : (result.metadata?.audio_duration ?? 0);

  return { segments, detectedLanguages, durationSeconds };
}
