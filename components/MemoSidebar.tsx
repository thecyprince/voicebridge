"use client";

import { Memo, Language } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Recorder } from "./Recorder";
import { toast } from "sonner";

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
  onMemoDeleted: (id: string) => void;
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
  onMemoDeleted,
}: MemoSidebarProps) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = window.confirm("Delete this memo? This cannot be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(error ?? "Delete failed");
      }
      onMemoDeleted(id);
      toast.success("Memo deleted.");
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed.");
    }
  };

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">
          Voice Memos
        </h1>
      </div>

      <ScrollArea className="flex-1">
        {memos.length === 0 ? (
          <p className="text-xs text-gray-400 p-4">
            No memos yet. Record your first one!
          </p>
        ) : (
          <ul>
            {memos.map((memo) => (
              <li key={memo.id} data-testid="memo-item">
                <button
                  onClick={() => onSelect(memo.id)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 transition-colors group relative",
                    selectedId === memo.id
                      ? "bg-white dark:bg-gray-800 border-l-2 border-l-blue-500"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {fmt(memo.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {memo.languages.map((l) => (
                        <span
                          key={l}
                          className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 rounded font-medium"
                        >
                          {LANG_CHIP[l]}
                        </span>
                      ))}
                      {/* Delete button — visible on hover */}
                      <span
                        role="button"
                        tabIndex={0}
                        data-testid="btn-delete-memo"
                        onClick={(e) => handleDelete(e, memo.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleDelete(e as any, memo.id)}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-opacity text-xs leading-none"
                        title="Delete memo"
                        aria-label="Delete memo"
                      >
                        ✕
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 truncate pr-4">
                    {memo.title}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
        <Recorder onMemoCreated={onMemoCreated} />
      </div>
    </aside>
  );
}
