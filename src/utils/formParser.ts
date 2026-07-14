import { WsmForm } from '../types';

export function extractWsmForm(text: string | undefined): { cleanText: string, formObj: WsmForm | null } {
  if (!text) return { cleanText: "", formObj: null };

  // Regex to match opening and closing tags for wsm_form (case-insensitive)
  const regex = /<(wsm_form)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/i;
  const match = regex.exec(text);

  if (!match) {
    // If we can't find a complete match, check if there's an opening tag but no closing tag yet (streaming)
    const openRegex = /<(wsm_form)(?:\s+[^>]*)?>/i;
    const openMatch = openRegex.exec(text);
    if (openMatch) {
      return { cleanText: text.substring(0, openMatch.index).trim(), formObj: null };
    }
    return { cleanText: text, formObj: null };
  }

  const [fullMatch, tagName, innerContent] = match;
  let jsonStr = innerContent.trim();
  
  // Clean markdown code blocks if the AI wrapped the JSON in them
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let formObj: WsmForm | null = null;
  try {
    formObj = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse form JSON inside tag:", tagName, e);
  }

  // Remove the tag content from the main text
  const cleanText = text.replace(fullMatch, "").trim();

  return { cleanText, formObj };
}
