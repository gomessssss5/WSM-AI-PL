import { WsmDocument } from '../types';

export function extractWsmDoc(text: string | undefined): { cleanText: string, docObj: WsmDocument | null, docObjs: WsmDocument[] } {
  if (!text) return { cleanText: "", docObj: null, docObjs: [] };

  const openTag = "<wsm_doc>";
  const closeTag = "</wsm_doc>";
  
  let currentText = text;
  const docObjs: WsmDocument[] = [];

  while (true) {
    const startIndex = currentText.indexOf(openTag);
    if (startIndex === -1) break;

    const endIndex = currentText.indexOf(closeTag, startIndex);
    if (endIndex !== -1) {
      // Full doc is present
      const jsonStr = currentText.substring(startIndex + openTag.length, endIndex).trim();
      currentText = currentText.substring(0, startIndex) + currentText.substring(endIndex + closeTag.length);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed) {
          docObjs.push(parsed);
        }
      } catch (e) {
        console.error("Failed to parse wsm_doc JSON", e);
      }
    } else {
      // Partial form (streaming doc tag)
      currentText = currentText.substring(0, startIndex);
      break;
    }
  }

  return { 
    cleanText: currentText.trim(), 
    docObj: docObjs.length > 0 ? docObjs[0] : null,
    docObjs 
  };
}
