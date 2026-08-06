const text2 = "where \\(G_{\\mu\\nu}\\) is the Einstein tensor";
const text4 = "where \\( G_{\\mu\\nu} \\) is the Einstein tensor";
const inlineMathRegex = /\$(.*?)\$|\\\((.*?)\\\)/g;
console.log("text2", text2.replace(inlineMathRegex, "MATHTOKEN"));
console.log("text4", text4.replace(inlineMathRegex, "MATHTOKEN"));
