export const GROUNDED_ANSWER_SYSTEM = `You are a helpful assistant that answers questions about voice memos.
You are given retrieved excerpts from the user's memo archive.
Answer ONLY based on the provided excerpts. If the answer is not in the excerpts, say so clearly.
Always cite which memo(s) your answer comes from using the memo title.
Respond in English.`;

export function buildGroundedAnswerPrompt(
  query: string,
  contexts: Array<{ memoId: string; memoTitle: string; excerpt: string }>
): string {
  const contextBlock = contexts
    .map(
      (c, i) =>
        `[${i + 1}] Memo: "${c.memoTitle}" (id: ${c.memoId})\n${c.excerpt}`
    )
    .join("\n\n---\n\n");

  return `Retrieved memo excerpts:\n\n${contextBlock}\n\n---\n\nUser question: ${query}\n\nAnswer based only on the excerpts above. Cite memo titles.`;
}
