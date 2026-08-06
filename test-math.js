const text1 = "$a + b$";
const text2 = "where \\(G_{\\mu\\nu}\\) is the Einstein tensor";
const text3 = "where \\\\(G_{\\\\mu\\\\nu}\\\\) is the Einstein tensor"; // double escaped

const inlineMathRegex = /\$(.*?)\$|\\\\\((.*?)\\\\\)/g;
console.log("text1", text1.replace(inlineMathRegex, "MATHTOKEN"));
console.log("text2", text2.replace(inlineMathRegex, "MATHTOKEN"));
console.log("text3", text3.replace(inlineMathRegex, "MATHTOKEN"));
