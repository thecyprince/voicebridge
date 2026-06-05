"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-lg leading-none p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleMemoDeleted = useCallback(
    (id: string) => {
      setMemos((prev) => {
        const next = prev.filter((m) => m.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    },
    [selectedId],
  );

  const handleMemoUpdated = useCallback((updated: Memo) => {
    setMemos((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {/* Hamburger on mobile */}
        <button
          className="md:hidden p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex-1 min-w-0">
          <SearchBar />
        </div>
        <ThemeToggle />
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar — hidden on mobile when collapsed */}
        <div
          className={[
            "absolute md:relative z-30 md:z-auto inset-y-0 left-0 transition-transform duration-200",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
        >
          <MemoSidebar
            memos={memos}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSidebarOpen(false); // auto-close on mobile
            }}
            onMemoCreated={handleMemoCreated}
            onMemoDeleted={handleMemoDeleted}
          />
        </div>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {selectedMemo ? (
          <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedMemo.title}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                <TranscriptView
                  segments={selectedMemo.segments}
                  memoId={selectedMemo.id}
                  onMemoUpdated={handleMemoUpdated}
                />
              </div>
            </div>

            <Separator orientation="vertical" />

            <div className="w-64 md:w-72 shrink-0 min-h-0 overflow-y-auto hidden sm:block">
              <SummaryPanel memo={selectedMemo} />
            </div>
          </main>
        ) : (
          <main className="flex flex-1 items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            {memos.length === 0
              ? "Record your first memo to get started."
              : "Select a memo from the sidebar."}
          </main>
        )}
      </div>
    </div>
  );
}
