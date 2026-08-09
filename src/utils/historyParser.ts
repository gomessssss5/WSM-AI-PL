/**
 * Utility functions to extract and clean invisible internal conversation memory (<history>...</history>)
 */

export function extractHistoryDoc(text: string): string | null {
  if (!text) return null;
  const match = text.match(/<history>([\s\S]*?)<\/history>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function cleanHistoryTags(text: string): string {
  if (!text) return "";
  let clean = text.replace(/<history>[\s\S]*?<\/history>/gi, "");
  if (clean.toLowerCase().includes('<history>')) {
    const idx = clean.toLowerCase().indexOf('<history>');
    clean = clean.slice(0, idx);
  }
  return clean.trim();
}
