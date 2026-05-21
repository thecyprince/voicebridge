"use client";

import { useState } from "react";
import { ActionItem, Memo } from "@/types";
import { Badge } from "@/components/ui/badge";

interface SummaryPanelProps {
  memo: Memo;
  onActionItemUpdated?: (memoId: string, item: ActionItem) => void;
}

function ActionItemRow({
  memoId,
  item,
  onUpdated,
}: {
  memoId: string;
  item: ActionItem;
  onUpdated?: (item: ActionItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [eventUrl, setEventUrl] = useState<string | null>(null);

  const addToCalendar = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoId,
          actionItemId: item.id,
          text: item.text,
          dueDate: item.dueDate,
        }),
      });
      const { eventUrl: url, error } = await res.json();
      if (error) throw new Error(error);
      setEventUrl(url);
      onUpdated?.({ ...item, calendarEventId: url });
    } catch (err: any) {
      alert(`Calendar error: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="text-gray-400 mt-0.5">☐</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{item.text}</p>
        {item.dueDate && (
          <p className="text-xs text-gray-400">
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </p>
        )}
        {eventUrl ? (
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline"
          >
            ✓ Added to Calendar
          </a>
        ) : item.calendarEventId ? (
          <span className="text-xs text-green-600">✓ In Calendar</span>
        ) : (
          <button
            onClick={addToCalendar}
            disabled={adding}
            className="text-xs text-blue-500 hover:underline"
          >
            {adding ? "Adding…" : "+ Calendar"}
          </button>
        )}
      </div>
    </li>
  );
}

export function SummaryPanel({ memo, onActionItemUpdated }: SummaryPanelProps) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Topics */}
      <div className="flex flex-wrap gap-1">
        {memo.topics.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>

      {/* Summary */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Summary
        </h4>
        <p className="text-sm text-gray-800 leading-relaxed">{memo.summary}</p>
      </div>

      {/* Action items */}
      {memo.actionItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Action Items
          </h4>
          <ul className="space-y-1">
            {memo.actionItems.map((item) => (
              <ActionItemRow
                key={item.id}
                memoId={memo.id}
                item={item}
                onUpdated={(updated) => onActionItemUpdated?.(memo.id, updated)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
