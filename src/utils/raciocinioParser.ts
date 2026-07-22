export function extractRaciocinio(text: string | undefined): { cleanText: string; raciocinio: string | null; isFinished: boolean } {
  if (!text) return { cleanText: "", raciocinio: null, isFinished: false };
  const startIndex = text.indexOf('<raciocinio>');
  if (startIndex === -1) {
    return { cleanText: text, raciocinio: null, isFinished: false };
  }
  const endIndex = text.indexOf('</raciocinio>');
  if (endIndex !== -1) {
    const raciocinio = text.slice(startIndex + 12, endIndex).trim();
    const cleanText = (text.slice(0, startIndex) + text.slice(endIndex + 13)).trim();
    return { cleanText, raciocinio, isFinished: true };
  } else {
    const raciocinio = text.slice(startIndex + 12).trim();
    const cleanText = text.slice(0, startIndex).trim();
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
  return clean.trim();
}
