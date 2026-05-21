"use client";

import { useState } from "react";
import { TranscriptSegment, Language } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const LANG_COLOR: Record<Language, string> = {
  ko: "bg-blue-100 text-blue-800",
  en: "bg-green-100 text-green-800",
  mixed: "bg-purple-100 text-purple-800",
  unknown: "bg-gray-100 text-gray-600",
};

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

export function TranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  if (segments.length === 0) {
    return <p className="text-sm text-gray-400 p-4">No transcript yet.</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {segments.map((seg) => (
          <SegmentRow key={seg.id} seg={seg} />
        ))}
      </div>
    </ScrollArea>
  );
}
