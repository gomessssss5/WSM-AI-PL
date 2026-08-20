import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock dependencies to avoid loading heavy packages or hitting uninitialized firebase
vi.mock('../../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn()
}));

vi.mock('../WsmMapComponent', () => ({
  default: function MockMap() { return <div className="mock-map">Map</div>; }
}));

vi.mock('../WsmChartComponent', () => ({
  default: function MockChart() { return <div className="mock-chart">Chart</div>; }
}));

vi.mock('../WsmMindmapComponent', () => ({
  default: function MockMindmap() { return <div className="mock-mindmap">Mindmap</div>; }
}));

vi.mock('katex', () => ({
  default: {
    renderToString: (tex: string) => `<span class="katex">${tex}</span>`
  }
}));

import MarkdownRenderer from '../MarkdownRenderer';

describe('MarkdownRenderer Snapshot Tests', () => {
  it('should render numbered lists correctly without duplicate markers', () => {
    const markdown = `
1. Primeiro item da lista
2. Segundo item da lista
3. Terceiro item da lista
    `.trim();

    const html = renderToString(<MarkdownRenderer content={markdown} />);
    
    // Check that we have list container and elements
    expect(html).toContain('Primeiro item da lista');
    expect(html).toContain('Segundo item da lista');
    expect(html).toContain('Terceiro item da lista');

    // Confirm standard bullet markers are parsed
    expect(html).toContain('1.');
    expect(html).toContain('2.');
    expect(html).toContain('3.');

    // Crucial check: make sure no list items contain duplicated "1. 1." or "1. 1. Primeiro"
    expect(html).not.toContain('1. 1.');
    expect(html).not.toContain('2. 2.');
    expect(html).not.toContain('3. 3.');
    
    // Snapshot-like matching of the output structure
    expect(html).toMatchSnapshot();
  });

  it('should render tables correctly with columns and rows', () => {
    const markdown = `
| Coluna A | Coluna B |
|----------|----------|
| Valor A1 | Valor B1 |
| Valor A2 | Valor B2 |
    `.trim();

    const html = renderToString(<MarkdownRenderer content={markdown} />);

    // Verify table structure
    expect(html).toContain('table');
    expect(html).toContain('Coluna A');
    expect(html).toContain('Coluna B');
    expect(html).toContain('Valor A1');
    expect(html).toContain('Valor B1');
    expect(html).toContain('Valor A2');
    expect(html).toContain('Valor B2');

    expect(html).toMatchSnapshot();
  });

  it('should render code blocks correctly with language tagging', () => {
    const markdown = `
\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
    `.trim();

    const html = renderToString(<MarkdownRenderer content={markdown} />);

    // Verify code block structures
    expect(html).toContain('typescript');
    expect(html).toContain('const greeting =');
    expect(html).toContain('console.log(greeting);');

    expect(html).toMatchSnapshot();
  });

  it('should render strikethrough, bold, italic, blockquotes, headers, and links correctly', () => {
    const markdown = `
# Título Principal H1
## Subtítulo H2
### Seção H3

Este é um texto com **negrito**, *itálico*, ~~tachado~~ e [Link Google](https://google.com).

> Esta é uma citação de teste.

- [x] Item de tarefa concluído
- [ ] Item de tarefa pendente
    `.trim();

    const html = renderToString(<MarkdownRenderer content={markdown} />);

    // Verify Headings
    expect(html).toContain('Título Principal H1');
    expect(html).toContain('Subtítulo H2');
    expect(html).toContain('Seção H3');

    // Verify Formatting
    expect(html).toContain('negrito');
    expect(html).toContain('itálico');
    expect(html).toContain('tachado');
    expect(html).toContain('line-through');

    // Verify Link & Blockquote
    expect(html).toContain('https://google.com');
    expect(html).toContain('Esta é uma citação de teste.');

    expect(html).toMatchSnapshot();
  });
});
