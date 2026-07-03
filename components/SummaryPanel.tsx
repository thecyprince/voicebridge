"use client";

import { useEffect, useState } from "react";
import { ActionItem, Memo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
    const tid = toast.loading("Adding to Google Calendar…");
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
      toast.success("Added to Google Calendar!", { id: tid });
    } catch (err: any) {
      const msg = err.message ?? "Calendar error";
      toast.error(msg, { id: tid });
    } finally {
      setAdding(false);
    }
  };

  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="text-gray-400 dark:text-gray-500 mt-0.5">☐</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">{item.text}</p>
        {item.dueDate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </p>
        )}
        {eventUrl ? (
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 dark:text-green-400 hover:underline"
          >
            ✓ Added to Calendar
          </a>
        ) : item.calendarEventId ? (
          <span className="text-xs text-green-600 dark:text-green-400">✓ In Calendar</span>
        ) : (
          <button
            onClick={addToCalendar}
            disabled={adding}
            className="text-xs text-blue-500 hover:underline disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Calendar"}
          </button>
        )}
      </div>
    </li>
  );
}

export function SummaryPanel({ memo, onActionItemUpdated }: SummaryPanelProps) {
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/calendar/status")
      .then((r) => r.json())
      .then((d) => setCalendarConnected(Boolean(d.connected)))
      .catch(() => setCalendarConnected(null));
  }, []);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full dark:bg-gray-900">
      {/* Topics */}
      <div className="flex flex-wrap gap-1">
        {memo.topics.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="text-xs dark:bg-gray-700 dark:text-gray-200"
          >
            {t}
          </Badge>
        ))}
      </div>

      {/* Summary */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Summary
        </h4>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          {memo.summary}
        </p>
      </div>

      {/* Action items */}
      {memo.actionItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
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

      {/* Calendar connect hint (hidden until status resolves) */}
      {calendarConnected !== null && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          {calendarConnected ? (
            <span
              className="text-xs text-green-600 dark:text-green-400"
              title="Google Calendar is connected — action items can be scheduled with one click"
            >
              ✓ Google Calendar connected
            </span>
          ) : (
            <a
              href="/api/calendar/connect"
              className="text-xs text-blue-400 hover:underline"
              title="Connect Google Calendar to enable one-click action item scheduling"
            >
              🔗 Connect Google Calendar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
