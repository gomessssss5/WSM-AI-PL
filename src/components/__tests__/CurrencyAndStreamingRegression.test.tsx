import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('../../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn()
}));

vi.mock('../WsmMapComponent', () => ({
  default: function MockMap({ lat, lon, place }: { lat: number; lon: number; place: string }) {
    return <div data-testid="wsm-map" data-place={place} data-lat={lat} data-lon={lon}>Mapa: {place} ({lat}, {lon})</div>;
  }
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
import { RightRunSidebar } from '../RightRunSidebar';

describe('Currency R$ and Streaming Table/Map Regression Tests', () => {
  it('renders Brazilian Real (R$) currency and prices in Markdown tables without math corruption', () => {
    const tableMarkdown = `
Aqui está a tabela comparativa dos carros e o mapa de São Paulo:

| Modelo | Preço (R$) | Consumo (km/l) |
|---|---|---|
| Fiat Mobi Like | R$ 72.990 | 14,2 (Gasolina) |
| Renault Kwid Zen | R$ 73.640 | 15,3 (Gasolina) |
| Citroën C3 Live | R$ 74.790 | 13,0 (Gasolina) |

<wsm_map lat="-23.5505" lon="-46.6333" place="São Paulo, SP" zoom="12" />
    `.trim();

    const html = renderToString(<MarkdownRenderer content={tableMarkdown} />);

    // 1. Tabela deve ser renderizada por completo
    expect(html).toContain('Preço (R$)');
    expect(html).toContain('Fiat Mobi Like');
    expect(html).toContain('R$ 72.990');
    expect(html).toContain('Renault Kwid Zen');
    expect(html).toContain('R$ 73.640');
    expect(html).toContain('Citroën C3 Live');
    expect(html).toContain('R$ 74.790');

    // 2. Não deve transformar preços em expressões KaTeX ou corromper
    expect(html).not.toContain('<span class="katex">72.990');
    expect(html).not.toContain('<span class="katex">R$');

    // 3. Mapa deve ser renderizado logo após a tabela
    expect(html).toContain('data-testid="wsm-map"');
    expect(html).toContain('São Paulo, SP');
  });

  it('differentiates LaTeX mathematical equations from currency symbols', () => {
    const mixedMarkdown = `
O valor inicial foi de R$ 50,00 e o final de R$ 120,00.
Em dólares, custou US$ 25.00 e $30.00.

Fórmula de física: $E = mc^2$
Equação quadrática: $ax^2 + bx + c = 0$
    `.trim();

    const html = renderToString(<MarkdownRenderer content={mixedMarkdown} />);

    // Moedas permanecem como texto legível
    expect(html).toContain('R$ 50,00');
    expect(html).toContain('R$ 120,00');
    expect(html).toContain('US$ 25.00');

    // Fórmulas matemáticas reais são convertidas para KaTeX
    expect(html).toContain('katex');
  });

  it('renders inline math variables like $x$ without leaving raw dollar signs in prose', () => {
    const mathProse = `
Para resolver a equação, precisamos isolar a variável $x$:
Primeiro, adicionamos 5 a ambos os lados da equação para isolar o termo com $x$:
Temos $3x - 5 = 16$, logo $3x = 21$.
Agora dividimos por 3 para encontrar o valor de $x$:
Obtemos $x = 7$.
Além disso, com duas variáveis $x$ e $y$, temos $x + y = 10$.
    `.trim();

    const html = renderToString(<MarkdownRenderer content={mathProse} />);

    // Não deve conter "$x$" cru como texto
    expect(html).not.toContain('>$x$<');
    expect(html).not.toContain(' $x$');
    expect(html).not.toContain('com $x$:');
    expect(html).not.toContain('variável $x$:');

    // Deve conter a renderização KaTeX do x
    expect(html).toContain('<span class="katex">x</span>');
    expect(html).toContain('isolar o termo com');
    expect(html).toContain('isolar a variável');
    expect(html).toContain('<span class="katex">3x = 21</span>');
    expect(html).toContain('<span class="katex">x = 7</span>');
  });

  it('renders Agent Execution Plan steps with LaTeX math in RightRunSidebar without leaking :::MATH0::: placeholders', () => {
    const mockRun = {
      id: 'run_test_math',
      sessionId: 'session_test',
      status: 'completed',
      objective: 'Resolução de equação algébrica com passos',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step_1',
          title: 'Etapa do plano de execução do agente',
          description: 'Adicione $5$ a ambos os lados da equação para isolar o termo com $3x$',
          status: 'completed',
          startedAt: new Date().toISOString()
        },
        {
          id: 'step_2',
          title: 'Etapa do plano de execução do agente',
          description: 'Divida ambos os lados por $3$ para encontrar o valor de $x$',
          status: 'completed',
          startedAt: new Date().toISOString()
        }
      ]
    };

    const html = renderToString(React.createElement(RightRunSidebar, { run: mockRun as any, isOpen: true }));

    // Não deve conter os placeholders crus :::MATH0::: ou :::MATH1:::
    expect(html).not.toContain(':::MATH');
    expect(html).not.toContain(':::MATH0:::');
    expect(html).not.toContain(':::MATH1:::');
    expect(html).not.toContain(':::MATH_');
    expect(html).not.toContain('@@@OMNIX_');

    // Deve conter a matemática renderizada via KaTeX
    expect(html).toContain('<span class="katex">5</span>');
    expect(html).toContain('<span class="katex">3x</span>');
    expect(html).toContain('<span class="katex">3</span>');
    expect(html).toContain('<span class="katex">x</span>');

    // Frases devem estar completas
    expect(html).toContain('Adicione');
    expect(html).toContain('a ambos os lados da equação para isolar o termo com');
    expect(html).toContain('Divida ambos os lados por');
    expect(html).toContain('para encontrar o valor de');
  });
});
