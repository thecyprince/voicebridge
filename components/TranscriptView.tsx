"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TranscriptSegment, Language, Memo } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const LANG_COLOR: Record<Language, string> = {
  ko: "bg-blue-100 text-blue-800",
  en: "bg-green-100 text-green-800",
  mixed: "bg-purple-100 text-purple-800",
  unknown: "bg-gray-100 text-gray-600",
};

const SPEAKER_COLORS = [
  "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
];

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SegmentRow({ seg }: { seg: TranscriptSegment }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const targetLang: "en" | "ko" = seg.language === "ko" ? "en" : "ko";

  const translate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: seg.text, targetLang }),
      });
      const { translation } = await res.json();
      setTranslation(translation);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-10 shrink-0 pt-0.5">
        {fmt(seg.start)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${LANG_COLOR[seg.language]}`}>
            {seg.language.toUpperCase()}
          </span>
          <p className="text-sm text-gray-800 leading-relaxed">{seg.text}</p>
        </div>
        {translation && (
          <p className="text-sm text-gray-500 italic mt-1 pl-10">{translation}</p>
        )}
        {seg.language !== "unknown" && !translation && (
          <button
            onClick={translate}
            disabled={loading}
            className="text-xs text-blue-500 hover:underline mt-1 pl-10"
          >
            {loading ? "Translating…" : `→ ${targetLang.toUpperCase()}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Speaker header with inline rename ─────────────────────────────────────────

function SpeakerHeader({
  speaker,
  displayName,
  memoId,
  onMemoUpdated,
}: {
  speaker: number;
  displayName: string;
  memoId: string;
  onMemoUpdated: (memo: Memo) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(displayName);
    setEditing(true);
  };

  const save = async () => {
    const name = draft.trim();
    setEditing(false);
    if (name === displayName) return;
    try {
      const res = await fetch(`/api/memos/${memoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker, name }),
      });
      if (!res.ok) throw new Error();
      const { memo } = await res.json();
      onMemoUpdated(memo);
      toast.success("Speaker renamed");
    } catch {
      toast.error("Couldn't rename speaker");
    }
  };

  const colorClass = SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];

  return (
    <div className="flex items-center gap-2 pt-4 first:pt-1 pb-1">
      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${colorClass}`}>
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); save(); }
              if (e.key === "Escape") setEditing(false);
            }}
            className="bg-transparent outline-none w-28 text-xs"
            autoFocus
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename"
            className="hover:opacity-70 transition-opacity"
          >
            {displayName}
          </button>
        )}
      </span>
      {!editing && (
        <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
          ✎ rename
        </span>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SpeakerGroup = { speaker: number; segments: TranscriptSegment[] };

function groupBySpeaker(segments: TranscriptSegment[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];
  for (const seg of segments) {
    const sp = seg.speaker ?? 0;
    const last = groups[groups.length - 1];
    if (last && last.speaker === sp) {
      last.segments.push(seg);
    } else {
      groups.push({ speaker: sp, segments: [seg] });
    }
  }
  return groups;
}

function resolveDisplayName(segments: TranscriptSegment[], speaker: number): string {
  return (
    segments.find((s) => s.speaker === speaker && s.speakerName)?.speakerName ??
    `Speaker ${speaker + 1}`
  );
}

function buildFullText(segments: TranscriptSegment[], hasDiarization: boolean): string {
  if (!hasDiarization) return segments.map((s) => s.text).join(" ");

  const lines: string[] = [];
  let lastSpeaker: number | undefined;
  let buffer: string[] = [];

  const flush = (sp: number) => {
    if (!buffer.length) return;
    const name = resolveDisplayName(segments, sp);
    lines.push(`${name}:\n${buffer.join(" ")}`);
    buffer = [];
  };

  for (const seg of segments) {
    const sp = seg.speaker ?? 0;
    if (lastSpeaker !== undefined && sp !== lastSpeaker) flush(lastSpeaker);
    buffer.push(seg.text);
    lastSpeaker = sp;
  }
  if (lastSpeaker !== undefined) flush(lastSpeaker);

  return lines.join("\n\n");
}

// ── Main component ────────────────────────────────────────────────────────────

export function TranscriptView({
  segments,
  memoId,
  onMemoUpdated,
}: {
  segments: TranscriptSegment[];
  memoId: string;
  onMemoUpdated: (memo: Memo) => void;
}) {
  const [view, setView] = useState<"segments" | "full">("segments");

  if (segments.length === 0) {
    return <p className="text-sm text-gray-400 p-4">No transcript yet.</p>;
  }

  const hasDiarization = segments.some((s) => s.speaker !== undefined);
  const groups = hasDiarization ? groupBySpeaker(segments) : null;
  const fullText = buildFullText(segments, hasDiarization);

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Transcript copied");
    } catch {
      toast.error("Couldn't copy transcript");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex rounded overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
          <button
            onClick={() => setView("segments")}
            className={`px-3 py-1 transition-colors ${
              view === "segments"
                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Segments
          </button>
          <button
            onClick={() => setView("full")}
            className={`px-3 py-1 transition-colors border-l border-gray-200 dark:border-gray-600 ${
              view === "full"
                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Full text
          </button>
        </div>
        {view === "full" && (
          <button
            onClick={copyTranscript}
            className="text-xs px-3 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Copy
          </button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="h-full">
        {view === "segments" ? (
          <div className="p-4">
            {groups ? (
              // Diarized: group by speaker with rename headers
              groups.map((group, gi) => (
                <div key={`${group.speaker}-${gi}`}>
                  <SpeakerHeader
                    speaker={group.speaker}
                    displayName={resolveDisplayName(segments, group.speaker)}
                    memoId={memoId}
                    onMemoUpdated={onMemoUpdated}
                  />
                  {group.segments.map((seg) => (
                    <SegmentRow key={seg.id} seg={seg} />
                  ))}
                </div>
              ))
            ) : (
              // Legacy / no diarization: flat list
              segments.map((seg) => <SegmentRow key={seg.id} seg={seg} />)
            )}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap select-text">
              {fullText}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
