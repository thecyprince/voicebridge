"use client";

import { useState, useRef } from "react";
import { SearchResult } from "@/types";
import { toast } from "sonner";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResult(data);
    } catch (err: any) {
      toast.error(err.message ?? "Search failed");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setOpen(false);
    setResult(null);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-4 py-2 shadow-sm">
        <span className="text-gray-400">🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Ask anything about your memos…"
          className="flex-1 text-sm outline-none bg-transparent text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
          data-testid="search-input"
        />
        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Searching…</span>
        )}
      </div>

      {open && result && (
        <div
          data-testid="search-results"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 p-4 space-y-3"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            ✕
          </button>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed pr-6">
            {result.answer}
          </p>
          {result.citations.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                Sources
              </p>
              <ul className="space-y-1">
                {result.citations.map((c) => (
                  <li key={c.memoId} className="text-xs text-blue-600 dark:text-blue-400">
                    {c.memoTitle}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      {" "}
                      — {c.excerpt.slice(0, 80)}…
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
