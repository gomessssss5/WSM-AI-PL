const fullOutput = `<wsm_doc format="html">
{"title":"index.html","content":"<!doctype html>\n<html><head><title>Test</title></head><body>Hello</body></html>","format":"html"}
</wsm_doc>`;
let wsmImageTokens = [];
let protectedOutput = fullOutput.replace(/<wsm_image\s+[^>]*\/>/gi, (match) => {
  const token = `___WSM_IMAGE_PROTECTED_${wsmImageTokens.length}___`;
  wsmImageTokens.push(match);
  return token;
});

protectedOutput = protectedOutput
  .replace(/!\[.*?\]\(data:image\/[^\)]+\)/gi, "")
  .replace(/data:image\/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]{80,}/gi, "")
  .replace(/<call[\s\S]*?(?:\/>|>)/gi, "")
  .replace(/<call:default_api[\s\S]*?(?:\/>|>)/gi, "")
  .replace(/call:default_api:[^\s>]+/gi, "")
  .trim();

console.log(protectedOutput);
