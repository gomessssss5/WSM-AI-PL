const fs = require('fs');
let code = fs.readFileSync('src/components/WsmMindmapComponent.tsx', 'utf8');

const targetStr1 = `  // Initialize/update standard view
  useEffect(() => {
    if (!svgRef.current || !markdown) return;`;

const replaceStr1 = `  // Initialize/update standard view
  useEffect(() => {
    if (!svgRef.current || !markdown || svgSize.width === 0) return;`;

code = code.replace(targetStr1, replaceStr1);

const targetStr2 = `  // Initialize/update fullscreen view when opened
  useEffect(() => {
    if (!isFullscreen || !fullscreenSvgRef.current || !markdown) return;`;

const replaceStr2 = `  // Initialize/update fullscreen view when opened
  useEffect(() => {
    if (!isFullscreen || !fullscreenSvgRef.current || !markdown || fullscreenSvgSize.width === 0) return;`;

code = code.replace(targetStr2, replaceStr2);

fs.writeFileSync('src/components/WsmMindmapComponent.tsx', code);
console.log('Mindmap defer patched');
