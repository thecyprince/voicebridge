"use client";

import { Memo, Language } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Recorder } from "./Recorder";

const LANG_CHIP: Record<Language, string> = {
  ko: "KO",
  en: "EN",
  mixed: "KO+EN",
  unknown: "?",
};

interface MemoSidebarProps {
  memos: Memo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMemoCreated: (memo: Memo) => void;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MemoSidebar({
  memos,
  selectedId,
  onSelect,
  onMemoCreated,
}: MemoSidebarProps) {
  return (
    <aside className="flex flex-col w-64 border-r border-gray-200 bg-gray-50 h-full shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-800">Voice Memos</h1>
      </div>

      <ScrollArea className="flex-1">
        {memos.length === 0 ? (
          <p className="text-xs text-gray-400 p-4">
            No memos yet. Record your first one!
          </p>
        ) : (
          <ul>
            {memos.map((memo) => (
              <li key={memo.id}>
                <button
                  onClick={() => onSelect(memo.id)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors",
                    selectedId === memo.id ? "bg-white border-l-2 border-l-blue-500" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-400">{fmt(memo.createdAt)}</span>
                    <div className="flex gap-1">
                      {memo.languages.map((l) => (
                        <span
                          key={l}
                          className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-medium"
                        >
                          {LANG_CHIP[l]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                    {memo.title}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 flex justify-center">
        <Recorder onMemoCreated={onMemoCreated} />
      </div>
    </aside>
  );
}
