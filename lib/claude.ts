import Anthropic from "@anthropic-ai/sdk";
import {
  SUMMARIZE_SYSTEM,
  summarizeTool,
  buildSummarizePrompt,
} from "./prompts/summarize";
import {
  GROUNDED_ANSWER_SYSTEM,
  buildGroundedAnswerPrompt,
} from "./prompts/grounded-answer";
import { buildTranslatePrompt } from "./prompts/translate";
import { ActionItem, SearchResult, TranscriptSegment } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

export async function summarizeMemo(segments: TranscriptSegment[]): Promise<{
  title: string;
  summary: string;
  topics: string[];
  actionItems: ActionItem[];
}> {
  const transcript = segments.map((s) => s.text).join(" ");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SUMMARIZE_SYSTEM,
    tools: [summarizeTool],
    tool_choice: { type: "tool", name: "extract_memo_info" },
    messages: [{ role: "user", content: buildSummarizePrompt(transcript) }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return tool_use block for summarization");
  }

  const input = toolUse.input as any;
  return {
    title: input.title,
    summary: input.summary,
    topics: input.topics ?? [],
    actionItems: (input.action_items ?? []).map((item: any) => ({
      id: crypto.randomUUID(),
      text: item.text,
      dueDate: item.due_date,
    })),
  };
}

export async function answerFromMemos(
  query: string,
  contexts: Array<{ memoId: string; memoTitle: string; excerpt: string }>
): Promise<SearchResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: GROUNDED_ANSWER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildGroundedAnswerPrompt(query, contexts),
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  // Parse which memos were cited (simple: include all contexts that appear referenced)
  const citations = contexts.filter((c) =>
    text.includes(c.memoTitle)
  );

  return { answer: text, citations };
}

export async function translateSegment(
  text: string,
  targetLang: "en" | "ko"
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      { role: "user", content: buildTranslatePrompt(text, targetLang) },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("")
    .trim();
}
