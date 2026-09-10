import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

let capturedProps: any = null;

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Bar: (props: any) => {
    capturedProps = props;
    return <div className="mock-bar-chart">Mock Bar Chart</div>;
  },
  Line: (props: any) => {
    capturedProps = props;
    return <div className="mock-line-chart">Mock Line Chart</div>;
  },
  Pie: (props: any) => <div className="mock-pie-chart">Mock Pie Chart</div>,
  Doughnut: (props: any) => <div className="mock-doughnut-chart">Mock Doughnut Chart</div>,
  Radar: (props: any) => <div className="mock-radar-chart">Mock Radar Chart</div>,
}));

import WsmChartComponent from '../WsmChartComponent';

describe('WsmChartComponent', () => {
  it('renders a bar chart without erroneous "Status" label for Brazilian states', () => {
    capturedProps = null;
    const data = JSON.stringify([
      { estado: 'São Paulo', populacao: 44.4 },
      { estado: 'Minas Gerais', populacao: 20.5 },
      { estado: 'Rio de Janeiro', populacao: 16.1 },
      { estado: 'Bahia', populacao: 14.1 },
      { estado: 'Rio Grande do Sul', populacao: 10.9 }
    ]);

    const html = renderToString(
      <WsmChartComponent
        type="bar"
        title="População dos 5 Maiores Estados"
        subtitle="Em milhões de habitantes"
        data={data}
      />
    );

    expect(html).toContain('População dos 5 Maiores Estados');
    expect(html).toContain('Em milhões de habitantes');
    // "Status" should NOT appear
    expect(html).not.toContain('Status');

    expect(capturedProps).toBeDefined();
    const chartData = capturedProps.data;
    const options = capturedProps.options;

    // Labels should be the 5 states
    expect(chartData.labels).toEqual([
      'São Paulo',
      'Minas Gerais',
      'Rio de Janeiro',
      'Bahia',
      'Rio Grande do Sul'
    ]);

    // Data points should be [44.4, 20.5, 16.1, 14.1, 10.9]
    expect(chartData.datasets[0].data).toEqual([44.4, 20.5, 16.1, 14.1, 10.9]);

    // X-axis ticks rotation should be 0 to keep labels straight
    expect(options.scales.x.ticks.maxRotation).toBe(0);
    expect(options.scales.x.ticks.minRotation).toBe(0);

    // Padding should ensure no cut-off
    expect(options.layout.padding.top).toBeGreaterThanOrEqual(20);
  });

  it('handles Brazilian formatted numbers with comma and million units context', () => {
    capturedProps = null;
    const data = JSON.stringify([
      { Estado: 'SP', Habitantes: '44,4' },
      { Estado: 'MG', Habitantes: '20,5' }
    ]);

    renderToString(
      <WsmChartComponent
        type="bar"
        title="População Estadual"
        yAxis="População (milhões)"
        data={data}
      />
    );

    expect(capturedProps).toBeDefined();
    const chartData = capturedProps.data;
    expect(chartData.datasets[0].data).toEqual([44.4, 20.5]);
  });

  it('correctly calculates dynamic domain ceiling (suggestedMax) for 45M dataset', () => {
    capturedProps = null;
    const data = JSON.stringify([
      { estado: 'São Paulo', populacao: '45 milhões' },
      { estado: 'Minas Gerais', populacao: '21 milhões' },
      { estado: 'Rio de Janeiro', populacao: 16 },
      { estado: 'Bahia', populacao: 14 },
      { estado: 'Rio Grande do Sul', populacao: 11 }
    ]);

    const html = renderToString(
      <WsmChartComponent
        type="bar"
        title="População dos 5 Maiores Estados"
        yAxis="População (milhões)"
        data={data}
      />
    );

    expect(html).toContain('População (milhões)');
    expect(capturedProps).toBeDefined();
    const chartData = capturedProps.data;
    const options = capturedProps.options;

    // São Paulo value should be exactly 45, Minas Gerais 21
    expect(chartData.datasets[0].data).toEqual([45, 21, 16, 14, 11]);

    // Top padding should be at least 40px
    expect(options.layout.padding.top).toBeGreaterThanOrEqual(40);

    // Suggested max ceiling should be Math.ceil(45 * 1.15) = 52
    expect(options.scales.y.suggestedMax).toBe(52);
  });
});
