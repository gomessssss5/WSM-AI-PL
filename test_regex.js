const regex = /<(wsm_doc)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/i;
let text = "<wsm_doc format=\"html\"><h1>hello</h1></wsm_doc>\n<wsm_doc format=\"md\"># markdown</wsm_doc>";
let currentText = text;
const rawDocObjs = [];
while (true) {
    const match = regex.exec(currentText);
    if (match) {
        rawDocObjs.push(match[2]);
        currentText = currentText.substring(0, match.index) + currentText.substring(match.index + match[0].length);
    } else {
        break;
    }
}
console.log(rawDocObjs);
