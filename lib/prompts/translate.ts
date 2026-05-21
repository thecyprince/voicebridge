export function buildTranslatePrompt(
  text: string,
  targetLang: "en" | "ko"
): string {
  const target = targetLang === "en" ? "English" : "Korean";
  return `Translate the following text to ${target}. Return only the translation, no explanation.\n\n${text}`;
}
