const fs = require('fs');
let code = fs.readFileSync('src/components/WsmMindmapComponent.tsx', 'utf8');

code = code.replace('  }, [markdown]);', '  }, [markdown, svgSize.width]);');
code = code.replace('  }, [isFullscreen, markdown]);', '  }, [isFullscreen, markdown, fullscreenSvgSize.width]);');

fs.writeFileSync('src/components/WsmMindmapComponent.tsx', code);
console.log('Mindmap deps patched');
