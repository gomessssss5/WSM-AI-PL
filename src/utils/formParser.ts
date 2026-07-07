import { WsmForm } from '../types';

export function extractWsmForm(text: string | undefined): { cleanText: string, formObj: WsmForm | null } {
  if (!text) return { cleanText: "", formObj: null };

  const openTag = "<wsm_form>";
  const closeTag = "</wsm_form>";
  
  const startIndex = text.indexOf(openTag);
  if (startIndex === -1) {
    return { cleanText: text, formObj: null };
  }
  
  const endIndex = text.indexOf(closeTag, startIndex);
  
  let cleanText = text;
  let formObj: WsmForm | null = null;
  
  if (endIndex !== -1) {
    // Full form is present
    const jsonStr = text.substring(startIndex + openTag.length, endIndex).trim();
    cleanText = text.substring(0, startIndex) + text.substring(endIndex + closeTag.length);
    try {
      formObj = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse wsm_form JSON", e);
    }
  } else {
    // Partial form (streaming)
    cleanText = text.substring(0, startIndex);
  }
  
  return { cleanText: cleanText.trim(), formObj };
}
