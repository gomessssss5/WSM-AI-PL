export function cleanCallTags(text: string | undefined): string {
  if (!text) return "";
  let clean = text.replace(/<call[\s\S]*?(?:\/>|>)/gi, "");
  clean = clean.replace(/<call:default_api[\s\S]*?(?:\/>|>)/gi, "");
  clean = clean.replace(/call:default_api:[^\s>]+/gi, "");
  return clean;
}

export function extractRaciocinio(text: string | undefined): { cleanText: string; raciocinio: string | null; isFinished: boolean } {
  if (!text) return { cleanText: "", raciocinio: null, isFinished: false };
  const cleanedCalls = cleanCallTags(text);
  const startIndex = cleanedCalls.indexOf('<raciocinio>');
  if (startIndex === -1) {
    return { cleanText: cleanedCalls, raciocinio: null, isFinished: false };
  }
  const endIndex = cleanedCalls.indexOf('</raciocinio>');
  if (endIndex !== -1) {
    const raciocinio = cleanedCalls.slice(startIndex + 12, endIndex).trim();
    const cleanText = (cleanedCalls.slice(0, startIndex) + cleanedCalls.slice(endIndex + 13)).trim();
    return { cleanText, raciocinio, isFinished: true };
  } else {
    const raciocinio = cleanedCalls.slice(startIndex + 12).trim();
    const cleanText = cleanedCalls.slice(0, startIndex).trim();
    return { cleanText, raciocinio, isFinished: false };
  }
}

export function cleanRaciocinioTags(text: string | undefined): string {
  if (!text) return "";
  let clean = text.replace(/<raciocinio>[\s\S]*?<\/raciocinio>/g, "");
  if (clean.includes('<raciocinio>')) {
    const idx = clean.indexOf('<raciocinio>');
    clean = clean.slice(0, idx);
  }
  clean = cleanCallTags(clean);
  return clean.trim();
}
