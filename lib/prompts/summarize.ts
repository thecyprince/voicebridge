export const SUMMARIZE_SYSTEM = `You are an expert assistant that processes voice memo transcripts.
The transcript may contain Korean, English, or a mix of both languages.
Your job is to extract structured information from the transcript.
Always respond in English regardless of the transcript language.`;

export const summarizeTool = {
  name: "extract_memo_info",
  description: "Extract a summary, topics, and action items from a voice memo transcript.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description:
          "A short, descriptive title for this memo (5-8 words max). In English.",
      },
      summary: {
        type: "string",
        description:
          "A concise 2-4 sentence summary of the key points. In English.",
      },
      topics: {
        type: "array",
        items: { type: "string" },
        description: "2-5 topic tags (e.g. 'interview', 'project planning', 'follow-up'). Lowercase English.",
      },
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "The action item in English." },
            due_date: {
              type: "string",
              description:
                "ISO 8601 date if a specific date was mentioned, otherwise omit.",
            },
          },
          required: ["text"],
        },
        description: "Concrete tasks, follow-ups, or commitments mentioned in the memo.",
      },
    },
    required: ["title", "summary", "topics", "action_items"],
  },
};

export function buildSummarizePrompt(transcript: string): string {
  return `Here is the voice memo transcript:\n\n<transcript>\n${transcript}\n</transcript>\n\nExtract structured information using the provided tool.`;
}
