import { WsmDocument } from '../types';

export function extractWsmDoc(text: string | undefined): { cleanText: string, docObj: WsmDocument | null } {
  if (!text) return { cleanText: "", docObj: null };

  const openTag = "<wsm_doc>";
  const closeTag = "</wsm_doc>";
  
  const startIndex = text.indexOf(openTag);
  if (startIndex === -1) {
    return { cleanText: text, docObj: null };
  }
  
  const endIndex = text.indexOf(closeTag, startIndex);
  
  let cleanText = text;
  let docObj: WsmDocument | null = null;
  
  if (endIndex !== -1) {
    // Full doc is present
    const jsonStr = text.substring(startIndex + openTag.length, endIndex).trim();
    cleanText = text.substring(0, startIndex) + text.substring(endIndex + closeTag.length);
    try {
      docObj = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse wsm_doc JSON", e);
    }
  } else {
    // Partial form (streaming)
    cleanText = text.substring(0, startIndex);
  }
  
  return { cleanText: cleanText.trim(), docObj };
}
