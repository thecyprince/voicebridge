"use client";

import { useEffect, useState, useCallback } from "react";
import { Memo } from "@/types";
import { MemoSidebar } from "@/components/MemoSidebar";
import { TranscriptView } from "@/components/TranscriptView";
import { SummaryPanel } from "@/components/SummaryPanel";
import { SearchBar } from "@/components/SearchBar";
import { Separator } from "@/components/ui/separator";

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    fetch("/api/memos")
      .then((r) => r.json())
      .then(({ memos }) => {
        setMemos(memos ?? []);
        if (memos?.length > 0) setSelectedId(memos[0].id);
      })
      .catch(console.error);
  }, []);

  const handleMemoCreated = useCallback((memo: Memo) => {
    setMemos((prev) => [memo, ...prev]);
    setSelectedId(memo.id);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 shrink-0">
        <SearchBar />
      </header>

      <div className="flex flex-1 min-h-0">
        <MemoSidebar
          memos={memos}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMemoCreated={handleMemoCreated}
        />

        {selectedMemo ? (
          <main className="flex flex-1 min-w-0 min-h-0">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="font-semibold text-gray-900">{selectedMemo.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selectedMemo.createdAt).toLocaleString()} ·{" "}
                  {fmtDuration(selectedMemo.durationSeconds)}
                </p>
                <audio
                  src={selectedMemo.audioUrl}
                  controls
                  className="mt-3 w-full h-8"
                />
              </div>
              <div className="flex-1 min-h-0">
                <TranscriptView segments={selectedMemo.segments} />
              </div>
            </div>

            <Separator orientation="vertical" />

            <div className="w-72 shrink-0 min-h-0 overflow-y-auto">
              <SummaryPanel memo={selectedMemo} />
            </div>
          </main>
        ) : (
          <main className="flex flex-1 items-center justify-center text-gray-400 text-sm">
            {memos.length === 0
              ? "Record your first memo to get started."
              : "Select a memo from the sidebar."}
          </main>
        )}
      </div>
    </div>
  );
}
