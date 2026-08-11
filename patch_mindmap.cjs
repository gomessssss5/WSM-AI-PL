const fs = require('fs');
let code = fs.readFileSync('src/components/WsmMindmapComponent.tsx', 'utf8');

const containerRefTarget = `const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null);`;

const containerRefReplacement = `const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [fullscreenSvgSize, setFullscreenSvgSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSvgSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFullscreen || !fullscreenContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setFullscreenSvgSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(fullscreenContainerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);`;

code = code.replace(containerRefTarget, containerRefReplacement);

const renderContentTarget = `      {/* SVG Container */}
      <div className={\`relative w-full \${isModal ? 'flex-1 h-full' : 'h-[380px] sm:h-[430px]'} bg-white dark:bg-neutral-900 overflow-hidden\`}>
        <svg 
          ref={isModal ? fullscreenSvgRef : svgRef} 
          className="w-full h-full text-gray-900 dark:text-neutral-100" 
        />
      </div>`;

const renderContentReplacement = `      {/* SVG Container */}
      <div 
        ref={isModal ? fullscreenContainerRef : containerRef}
        className={\`relative w-full \${isModal ? 'flex-1 h-full' : 'h-[380px] sm:h-[430px]'} bg-white dark:bg-neutral-900 overflow-hidden\`}
      >
        <svg 
          ref={isModal ? fullscreenSvgRef : svgRef} 
          width={isModal ? fullscreenSvgSize.width : svgSize.width}
          height={isModal ? fullscreenSvgSize.height : svgSize.height}
          className="text-gray-900 dark:text-neutral-100"
          style={{ visibility: ((isModal ? fullscreenSvgSize.width : svgSize.width) > 0) ? 'visible' : 'hidden' }}
        />
      </div>`;

code = code.replace(renderContentTarget, renderContentReplacement);

fs.writeFileSync('src/components/WsmMindmapComponent.tsx', code);
console.log('Mindmap component patched');
