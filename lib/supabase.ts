import { createClient } from "@supabase/supabase-js";
import { Memo } from "@/types";

// Server-side only (service role). Never import on the client.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveMemo(memo: Memo): Promise<void> {
  const { error } = await supabase.from("memos").insert({
    id: memo.id,
    title: memo.title,
    created_at: memo.createdAt,
    audio_url: memo.audioUrl,
    duration_seconds: memo.durationSeconds,
    languages: memo.languages,
    segments: memo.segments,
    summary: memo.summary,
    topics: memo.topics,
    action_items: memo.actionItems,
  });
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

export async function listMemos(): Promise<Memo[]> {
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase list failed: ${error.message}`);
  return (data ?? []).map(rowToMemo);
}

export async function getMemo(id: string): Promise<Memo | null> {
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return rowToMemo(data);
}

export async function getMemosByIds(ids: string[]): Promise<Memo[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return (data ?? []).map(rowToMemo);
}

export async function deleteMemo(id: string): Promise<void> {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

export async function updateActionItemCalendarId(
  memoId: string,
  actionItemId: string,
  calendarEventId: string,
): Promise<void> {
  const memo = await getMemo(memoId);
  if (!memo) throw new Error("Memo not found");

  const updatedItems = memo.actionItems.map((item) =>
    item.id === actionItemId ? { ...item, calendarEventId } : item,
  );

  const { error } = await supabase
    .from("memos")
    .update({ action_items: updatedItems })
    .eq("id", memoId);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

function rowToMemo(row: any): Memo {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    languages: row.languages,
    segments: row.segments,
    summary: row.summary,
    topics: row.topics,
    actionItems: row.action_items,
  };
}
