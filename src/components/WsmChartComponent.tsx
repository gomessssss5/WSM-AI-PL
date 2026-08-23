import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

interface WsmChartComponentProps {
  type: string;
  title?: string;
  subtitle?: string;
  data: string | any; // JSON string or object
  xAxis?: string;
  yAxis?: string;
  xLabel?: string;
  yLabel?: string;
}

const PALETTE = [
  '#111111',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#64748b'
];

const isGenericLabelKey = (k: string): boolean => {
  if (!k) return true;
  const clean = k.toLowerCase().trim();
  return ['name', 'nome', 'label', 'x', 'eixo_x', 'eixox', 'item', 'key', 'campo', 'coluna', 'rotulo', 'rótulo'].includes(clean);
};

const isGenericValueKey = (k: string): boolean => {
  if (!k) return true;
  const clean = k.toLowerCase().trim();
  return ['valor', 'val', 'value', 'y', 'eixo_y', 'eixoy', 'data', 'num', 'total', 'count', 'qtd', 'valores'].includes(clean);
};

const humanizeLabel = (k: string): string => {
  if (!k) return '';
  const clean = k.toLowerCase().trim();
  if (['mes', 'mês', 'month'].includes(clean)) return 'Mês';
  if (['ano', 'year'].includes(clean)) return 'Ano';
  if (['trimestre', 'quarter', 'tri'].includes(clean)) return 'Trimestre';
  if (['semestre', 'semester'].includes(clean)) return 'Semestre';
  if (['dia', 'day', 'data', 'date'].includes(clean)) return 'Data';
  if (['categoria', 'category'].includes(clean)) return 'Categoria';
  if (['vendas', 'sales'].includes(clean)) return 'Vendas';
  if (['receita', 'revenue', 'faturamento'].includes(clean)) return 'Receita';
  if (['lucro', 'profit'].includes(clean)) return 'Lucro';
  if (['despesa', 'despesas', 'custos', 'expense'].includes(clean)) return 'Despesas';
  if (['cidade', 'city', 'local', 'regiao', 'região'].includes(clean)) return 'Região';
  if (['produto', 'product', 'servico', 'serviço'].includes(clean)) return 'Produto';
  if (['status', 'estado'].includes(clean)) return 'Status';
  if (isGenericLabelKey(clean) || isGenericValueKey(clean)) return '';
  return k.charAt(0).toUpperCase() + k.slice(1);
};

export default function WsmChartComponent({ type, title, subtitle, data, xAxis, yAxis, xLabel, yLabel }: WsmChartComponentProps) {
  const chartData = useMemo(() => {
    try {
      let raw: any = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!raw) return null;

      // Case 1: Chart.js standard format { labels: [...], datasets: [...] }
      if (raw.labels && Array.isArray(raw.datasets)) {
        return raw;
      }

      // If array of items
      if (Array.isArray(raw)) {
        if (raw.length === 0) return null;

        const first = raw[0];
        const keys = Object.keys(first);

        // Find primary label key (prefer specific time/category domain keys before generic keys)
        const domainLabelKey = keys.find(k => ['trimestre', 'tri', 'mes', 'mês', 'month', 'ano', 'year', 'categoria', 'produto', 'regiao', 'região', 'cidade', 'item', 'nome'].includes(k.toLowerCase()));
        const labelKey = domainLabelKey || keys.find(k => ['name', 'label', 'x', 'eixo_x'].includes(k.toLowerCase())) || keys[0];
        
        const numericKeys = keys.filter(k => k !== labelKey && (typeof first[k] === 'number' || (!isNaN(Number(first[k])) && first[k] !== '')));

        const labels = raw.map(item => String(item[labelKey] ?? ''));

        if (type === 'pie' || type === 'doughnut') {
          const valueKey = numericKeys[0] || keys.find(k => k !== labelKey) || keys[0];
          const friendlyY = !isGenericValueKey(valueKey) ? humanizeLabel(valueKey) : '';
          const friendlyX = !isGenericLabelKey(labelKey) ? humanizeLabel(labelKey) : '';
          return {
            labels,
            datasets: [{
              data: raw.map(item => Number(item[valueKey] ?? 0)),
              backgroundColor: PALETTE.slice(0, labels.length),
              borderColor: '#ffffff',
              borderWidth: 3,
              hoverOffset: 8
            }],
            inferredXLabel: friendlyX,
            inferredYLabel: friendlyY
          };
        }

        // Bar or Line chart with 1 or more datasets
        if (numericKeys.length > 0) {
          const datasets = numericKeys.map((key, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const friendlyKey = !isGenericValueKey(key) ? humanizeLabel(key) : (title || 'Valores');
            return {
              label: friendlyKey || (title || 'Valores'),
              data: raw.map(item => Number(item[key] ?? 0)),
              borderColor: color,
              backgroundColor: type === 'line' ? `${color}18` : color,
              borderWidth: 2,
              borderRadius: type.includes('bar') ? 6 : 0,
              tension: 0.4,
              fill: type === 'line',
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: color,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            };
          });

          const friendlyX = !isGenericLabelKey(labelKey) ? humanizeLabel(labelKey) : '';
          const friendlyYList = numericKeys
            .map(k => !isGenericValueKey(k) ? humanizeLabel(k) : '')
            .filter(Boolean);
          const friendlyY = friendlyYList.length > 0 ? friendlyYList.join(', ') : '';

          return { 
            labels, 
            datasets,
            inferredXLabel: friendlyX,
            inferredYLabel: friendlyY
          };
        } else {
          // Fallback if all values are simple numbers
          const valueKey = keys[1] || keys[0];
          const friendlyX = !isGenericLabelKey(labelKey) ? humanizeLabel(labelKey) : '';
          const friendlyY = !isGenericValueKey(valueKey) ? humanizeLabel(valueKey) : '';
          return {
            labels,
            datasets: [{
              label: title || 'Valores',
              data: raw.map(item => Number(item[valueKey] ?? 0)),
              borderColor: '#111111',
              backgroundColor: type === 'line' ? 'rgba(17, 17, 17, 0.06)' : '#111111',
              borderWidth: 2,
              borderRadius: type.includes('bar') ? 6 : 0,
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#111111',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            }],
            inferredXLabel: friendlyX,
            inferredYLabel: friendlyY
          };
        }
      }

      // Single object key-value map e.g. { "Jan": 10, "Fev": 20 }
      if (typeof raw === 'object') {
        const labels = Object.keys(raw);
        const values = Object.values(raw).map(v => Number(v));
        return {
          labels,
          datasets: [{
            label: title || 'Dados',
            data: values,
            borderColor: '#111111',
            backgroundColor: (type === 'pie' || type === 'doughnut') ? PALETTE.slice(0, labels.length) : 'rgba(17, 17, 17, 0.06)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        };
      }

      return null;
    } catch (e) {
      console.error('Erro ao processar dados do gráfico:', e);
      return null;
    }
  }, [data, type, title]);

  const rawX = (xLabel || xAxis || (chartData as any)?.inferredXLabel || '').trim();
  const rawY = (yLabel || yAxis || (chartData as any)?.inferredYLabel || '').trim();
  
  // Only display axis titles if they are meaningful user-friendly labels (never raw 'name', 'valor', 'x', 'y')
  const resolvedXLabel = !isGenericLabelKey(rawX) ? humanizeLabel(rawX) || rawX : '';
  const resolvedYLabel = !isGenericValueKey(rawY) ? humanizeLabel(rawY) || rawY : '';

  if (!chartData) {
    return (
      <div className="my-5 p-6 border border-gray-200 dark:border-neutral-800 rounded-2xl bg-gray-50 dark:bg-neutral-900 flex items-center justify-center min-h-[220px]">
        <span className="text-gray-500 text-sm font-medium">Sem dados suficientes para renderizar o gráfico.</span>
      </div>
    );
  }

  // Base options for Chart.js
  const baseOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: type === 'pie' || type === 'doughnut' || (chartData.datasets && chartData.datasets.length > 1),
        position: type === 'pie' || type === 'doughnut' ? 'bottom' : 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          color: '#666666',
          font: { size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#111111',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        titleFont: { size: 12, weight: '500' },
        bodyFont: { size: 13, weight: '600' }
      }
    },
    scales: (type === 'pie' || type === 'doughnut' || type === 'radar') ? undefined : {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: '#888888', font: { size: 12 } },
        title: {
          display: Boolean(resolvedXLabel),
          text: resolvedXLabel,
          color: '#666666',
          font: { size: 12, weight: '600' },
          padding: { top: 8 }
        }
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#f1f1f1', drawTicks: false },
        ticks: { color: '#888888', padding: 8, font: { size: 12 } },
        title: {
          display: Boolean(resolvedYLabel),
          text: resolvedYLabel,
          color: '#666666',
          font: { size: 12, weight: '600' },
          padding: { bottom: 8 }
        }
      }
    }
  };

  const chartAriaLabel = `${title || 'Gráfico'}.${resolvedXLabel ? ` Eixo X: ${resolvedXLabel}.` : ''}${resolvedYLabel ? ` Eixo Y: ${resolvedYLabel}.` : ''}`;

  const renderChartCanvas = () => {
    const normalizedType = type.toLowerCase();
    const commonProps = {
      data: chartData,
      options: baseOptions,
      'aria-label': chartAriaLabel,
      role: 'img'
    };
    switch (normalizedType) {
      case 'pie':
        return <Pie {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'bar_horizontal':
        return <Bar {...commonProps} options={{ ...baseOptions, indexAxis: 'y' as const }} />;
      case 'bar_vertical':
      case 'bar':
        return <Bar {...commonProps} />;
      case 'radar':
        return <Radar {...commonProps} />;
      case 'line':
      default:
        return <Line {...commonProps} />;
    }
  };

  return (
    <div className="my-5 w-full max-w-full border border-gray-200/80 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm overflow-hidden transition-all">
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="m-0 text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-neutral-100">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      )}
      <div 
        role="region" 
        aria-label={title ? `Gráfico: ${title}` : 'Visualização de gráfico de dados'}
        tabIndex={0}
        className="relative w-full h-[320px] sm:h-[380px]"
      >
        {renderChartCanvas()}
        <span className="sr-only">
          {title ? `Gráfico de ${title}.` : 'Gráfico de dados.'}
          {resolvedXLabel ? ` Eixo X: ${resolvedXLabel}.` : ''}
          {resolvedYLabel ? ` Eixo Y: ${resolvedYLabel}.` : ''}
        </span>
      </div>
    </div>
  );
}
