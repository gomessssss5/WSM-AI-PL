const fs = require('fs');
let code = fs.readFileSync('src/components/DocumentCard.tsx', 'utf8');

code = code.replace(/link\.download = \`\$\{document\.title \|\| 'arquivo'\}\.\$\{format\}\`;/g, 
  `let fname = document.title || 'arquivo';
      if (!fname.toLowerCase().endsWith('.' + format)) fname += '.' + format;
      link.download = fname;`);

code = code.replace(/link\.download = \`\$\{document\.title \|\| 'planilha'\}\.xlsx\`;/g, 
  `let fname = document.title || 'planilha';
        if (!fname.toLowerCase().endsWith('.xlsx')) fname += '.xlsx';
        link.download = fname;`);

code = code.replace(/link\.download = \`\$\{document\.title \|\| 'documento'\}\.pdf\`;/g, 
  `let fname = document.title || 'documento';
        if (!fname.toLowerCase().endsWith('.pdf')) fname += '.pdf';
        link.download = fname;`);

fs.writeFileSync('src/components/DocumentCard.tsx', code);

// Same for DocumentViewerPane.tsx
let pane = fs.readFileSync('src/components/DocumentViewerPane.tsx', 'utf8');
pane = pane.replace(/link\.download = \`\$\{document\.title \|\| 'arquivo'\}\.\$\{format\}\`;/g, 
  `let fname = document.title || 'arquivo';
      if (!fname.toLowerCase().endsWith('.' + format)) fname += '.' + format;
      link.download = fname;`);

pane = pane.replace(/link\.download = \`\$\{document\.title \|\| 'planilha'\}\.xlsx\`;/g, 
  `let fname = document.title || 'planilha';
        if (!fname.toLowerCase().endsWith('.xlsx')) fname += '.xlsx';
        link.download = fname;`);

pane = pane.replace(/link\.download = \`\$\{document\.title \|\| 'documento'\}\.pdf\`;/g, 
  `let fname = document.title || 'documento';
        if (!fname.toLowerCase().endsWith('.pdf')) fname += '.pdf';
        link.download = fname;`);

fs.writeFileSync('src/components/DocumentViewerPane.tsx', pane);
