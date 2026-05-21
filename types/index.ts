export type Language = "ko" | "en" | "mixed" | "unknown";

export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number;
  text: string;
  language: Language;
  translation?: string; // populated on demand
}

export interface ActionItem {
  id: string;
  text: string;
  dueDate?: string; // ISO 8601 if detected
  calendarEventId?: string; // populated after Google Calendar creation
}

export interface Memo {
  id: string;
  title: string;
  createdAt: string; // ISO 8601
  audioUrl: string;
  durationSeconds: number;
  languages: Language[]; // detected languages in the memo
  segments: TranscriptSegment[];
  summary: string;
  topics: string[];
  actionItems: ActionItem[];
}

export interface SearchResult {
  answer: string;
  citations: Array<{
    memoId: string;
    memoTitle: string;
    excerpt: string;
  }>;
}
