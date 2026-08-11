const fs = require('fs');
let code = fs.readFileSync('src/components/WsmMindmapComponent.tsx', 'utf8');

const targetStr = `  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [fullscreenSvgSize, setFullscreenSvgSize] = useState({ width: 0, height: 0 });`;

const replaceStr = `  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [fullscreenSvgSize, setFullscreenSvgSize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);`;

code = code.replace(targetStr, replaceStr);

const removeStr = `  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);`;

const lastIndex = code.lastIndexOf(removeStr);
if (lastIndex !== -1) {
  code = code.substring(0, lastIndex) + code.substring(lastIndex + removeStr.length);
}

fs.writeFileSync('src/components/WsmMindmapComponent.tsx', code);
console.log('Fixed state order');
