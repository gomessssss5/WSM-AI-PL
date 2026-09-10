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
  unit?: string;
}

const PALETTE = [
  '#2563eb', // Clean Royal Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#475569', // Slate
  '#16a34a'  // Green
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

const isMetadataOrIndexKey = (k: string): boolean => {
  if (!k) return false;
  const clean = k.toLowerCase().trim();
  return ['id', 'ranking', 'rank', 'posicao', 'posição', 'pos', 'ordem', 'index', 'idx', 'numero', 'número', 'num_ordem', 'n'].includes(clean);
};

const humanizeLabel = (k: string): string => {
  if (!k) return '';
  const clean = k.toLowerCase().trim();
  if (['mes', 'mês', 'month', 'meses'].includes(clean)) return 'Mês';
  if (['ano', 'year', 'anos'].includes(clean)) return 'Ano';
  if (['trimestre', 'quarter', 'tri'].includes(clean)) return 'Trimestre';
  if (['semestre', 'semester'].includes(clean)) return 'Semestre';
  if (['dia', 'day', 'data', 'date', 'dias'].includes(clean)) return 'Data';
  if (['categoria', 'category', 'categorias'].includes(clean)) return 'Categoria';
  if (['vendas', 'sales'].includes(clean)) return 'Vendas';
  if (['receita', 'revenue', 'faturamento'].includes(clean)) return 'Receita (R$)';
  if (['lucro', 'profit'].includes(clean)) return 'Lucro (R$)';
  if (['despesa', 'despesas', 'custos', 'expense'].includes(clean)) return 'Despesas (R$)';
  if (['cidade', 'city', 'local', 'municipio', 'município'].includes(clean)) return 'Cidade';
  if (['regiao', 'região', 'region'].includes(clean)) return 'Região';
  if (['estado', 'estados', 'uf', 'ufs', 'state'].includes(clean)) return 'Estado';
  if (['pais', 'país', 'country'].includes(clean)) return 'País';
  if (['produto', 'product', 'produtos'].includes(clean)) return 'Produto';
  if (['servico', 'serviço', 'servicos', 'serviços'].includes(clean)) return 'Serviço';
  if (['populacao', 'população', 'habitantes', 'pop', 'moradores'].includes(clean)) return 'População (milhões)';
  if (['porcentagem', 'percentual', 'pct', 'taxa'].includes(clean)) return 'Taxa (%)';
  if (['quantidade', 'qtd', 'volume', 'unidades'].includes(clean)) return 'Quantidade';
  if (clean === 'status') return 'Status';
  if (isGenericLabelKey(clean) || isGenericValueKey(clean)) return '';
  return k.charAt(0).toUpperCase() + k.slice(1);
};

/**
 * Robust numeric parser that handles numbers, strings with units ("45 milhões"),
 * Brazilian decimal comma format ("44,4"), currency symbols, and dot-separated thousands.
 */
function parseNumericValue(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;

    // Direct clean float or int (e.g. "45", "44.4", "-10")
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : num;
    }

    // Brazilian format without units: "44,4" or "44,40"
    if (/^-?\d+(,\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }

    // Match leading number portion before unit words (e.g. "45 milhões", "44,4 mi", "45M")
    const leadingNumMatch = trimmed.match(/^-?[\d.,]+/);
    if (leadingNumMatch) {
      let cleaned = leadingNumMatch[0];
      if (cleaned.includes(',') && cleaned.includes('.')) {
        if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
      }
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }

    // Fallback cleanup
    let cleaned = trimmed.replace(/[^\d.,\-]/g, '');
    if (!cleaned) return 0;

    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return Number(val) || 0;
}

export default function WsmChartComponent({ type, title, subtitle, data, xAxis, yAxis, xLabel, yLabel, unit }: WsmChartComponentProps) {
  // Extract contextual unit from title/subtitle/props
  const contextText = `${title || ''} ${subtitle || ''} ${yAxis || ''} ${yLabel || ''} ${unit || ''}`.toLowerCase();
  const isMillionsContext = /milh[õo]es|milh[ãa]o|\bmi\b/i.test(contextText);
  const isCurrencyContext = /r\$|reais|receita|faturamento|lucro|custo|preço|preco/i.test(contextText);
  const isPercentContext = /%|porcento|porcentagem|taxa|percentual/i.test(contextText);

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

        // Find primary categorical label key (prefer geographic, time, or category keys)
        const domainLabelKey = keys.find(k => [
          'estado', 'estados', 'uf', 'ufs', 'pais', 'país', 'country', 'cidade', 'city',
          'regiao', 'região', 'trimestre', 'tri', 'mes', 'mês', 'month', 'ano', 'year',
          'data', 'date', 'dia', 'day', 'categoria', 'category', 'produto', 'product',
          'servico', 'serviço', 'segmento', 'item', 'nome', 'name', 'label'
        ].includes(k.toLowerCase().trim()));

        const labelKey = domainLabelKey || keys.find(k => ['name', 'label', 'x', 'eixo_x'].includes(k.toLowerCase())) || keys[0];

        // Filter out the labelKey to find value candidate keys
        const remainingKeys = keys.filter(k => k !== labelKey);

        // Separate metric keys from index/ordinal keys (e.g. prioritize 'populacao' over 'ranking' or 'id')
        const allNumericKeys = remainingKeys.filter(k => {
          return raw.some(item => {
            const val = item[k];
            return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(parseNumericValue(val)));
          });
        });

        const pureMetricKeys = allNumericKeys.filter(k => !isMetadataOrIndexKey(k));
        const numericKeys = pureMetricKeys.length > 0 ? pureMetricKeys : allNumericKeys;

        const labels = raw.map(item => String(item[labelKey] ?? ''));

        if (type === 'pie' || type === 'doughnut') {
          const valueKey = numericKeys[0] || remainingKeys[0] || keys[0];
          const friendlyY = !isGenericValueKey(valueKey) ? humanizeLabel(valueKey) : '';
          const friendlyX = !isGenericLabelKey(labelKey) ? humanizeLabel(labelKey) : '';
          return {
            labels,
            datasets: [{
              data: raw.map(item => parseNumericValue(item[valueKey])),
              backgroundColor: PALETTE.slice(0, Math.max(labels.length, PALETTE.length)),
              borderColor: '#ffffff',
              borderWidth: 2,
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
            const friendlyKey = !isGenericValueKey(key) ? humanizeLabel(key) : '';
            const datasetLabel = friendlyKey || (numericKeys.length > 1 ? `Série ${idx + 1}` : (title || 'Valor'));
            
            return {
              label: datasetLabel,
              data: raw.map(item => parseNumericValue(item[key])),
              borderColor: color,
              backgroundColor: type === 'line' ? `${color}20` : color,
              borderWidth: type === 'line' ? 2.5 : 1.5,
              borderRadius: type.includes('bar') ? 6 : 0,
              tension: 0.35,
              fill: type === 'line',
              pointRadius: 4,
              pointHoverRadius: 7,
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
          // Fallback if all values are simple key-value pairs
          const valueKey = remainingKeys[0] || keys[1] || keys[0];
          const friendlyX = !isGenericLabelKey(labelKey) ? humanizeLabel(labelKey) : '';
          const friendlyY = !isGenericValueKey(valueKey) ? humanizeLabel(valueKey) : '';
          return {
            labels,
            datasets: [{
              label: title || 'Valor',
              data: raw.map(item => parseNumericValue(item[valueKey])),
              borderColor: PALETTE[0],
              backgroundColor: type === 'line' ? `${PALETTE[0]}20` : PALETTE[0],
              borderWidth: 2,
              borderRadius: type.includes('bar') ? 6 : 0,
              tension: 0.35,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 7,
              pointBackgroundColor: PALETTE[0],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            }],
            inferredXLabel: friendlyX,
            inferredYLabel: friendlyY
          };
        }
      }

      // Single object key-value map e.g. { "SP": 44.4, "MG": 20.5 }
      if (typeof raw === 'object') {
        const labels = Object.keys(raw);
        const values = Object.values(raw).map(v => parseNumericValue(v));
        return {
          labels,
          datasets: [{
            label: title || 'Valor',
            data: values,
            borderColor: PALETTE[0],
            backgroundColor: (type === 'pie' || type === 'doughnut') 
              ? PALETTE.slice(0, labels.length) 
              : (type === 'line' ? `${PALETTE[0]}20` : PALETTE[0]),
            borderWidth: 2,
            borderRadius: type.includes('bar') ? 6 : 0,
            tension: 0.35,
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
  
  // Clean, humanized axis titles (never raw keys or mistaken "Status")
  let resolvedXLabel = !isGenericLabelKey(rawX) ? humanizeLabel(rawX) || rawX : '';
  let resolvedYLabel = !isGenericValueKey(rawY) ? humanizeLabel(rawY) || rawY : '';

  // Prevent unwanted "Status" on X axis if it was just inferred
  if (resolvedXLabel.toLowerCase() === 'status' && !xAxis && !xLabel) {
    resolvedXLabel = '';
  }

  // If context is population and resolvedYLabel is empty or generic, enrich with unit
  if (!resolvedYLabel && isMillionsContext) {
    resolvedYLabel = 'População (milhões)';
  } else if (!resolvedYLabel && isCurrencyContext) {
    resolvedYLabel = 'Valor (R$)';
  } else if (!resolvedYLabel && isPercentContext) {
    resolvedYLabel = 'Taxa (%)';
  }

  if (!chartData) {
    return (
      <div className="my-5 p-6 border border-gray-200 dark:border-neutral-800 rounded-2xl bg-gray-50 dark:bg-neutral-900 flex items-center justify-center min-h-[220px]">
        <span className="text-gray-500 text-sm font-medium">Sem dados suficientes para renderizar o gráfico.</span>
      </div>
    );
  }

  const isMultipleDatasets = chartData.datasets && chartData.datasets.length > 1;

  // Calculate dynamic maximum value and domain ceiling across all datasets
  const allValues = useMemo(() => {
    if (!chartData || !chartData.datasets) return [];
    return chartData.datasets.flatMap((ds: any) => ds.data || [])
      .map((v: any) => typeof v === 'number' ? v : parseNumericValue(v))
      .filter((v: number) => !isNaN(v) && isFinite(v));
  }, [chartData]);

  const maxDataValue = allValues.length > 0 ? Math.max(...allValues) : 0;

  // Compute dynamic domain maximum ceiling with 15% breathing room (e.g. max 45 -> 55, max 20 -> 25)
  const yAxisMax = useMemo(() => {
    if (maxDataValue <= 0) return undefined;
    if (maxDataValue <= 1) return Number((maxDataValue * 1.25).toFixed(2));
    if (maxDataValue <= 10) return Math.ceil(maxDataValue * 1.2);
    const rawMax = maxDataValue * 1.15;
    const step = maxDataValue >= 100 ? 50 : (maxDataValue >= 20 ? 5 : 2);
    return Math.ceil(rawMax / step) * step;
  }, [maxDataValue]);

  // Base options for Chart.js
  const baseOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 50, // Generous 50px top padding ensures highest bars and vertical axis titles never get clipped
        left: 16,
        right: 24,
        bottom: 16
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: type === 'pie' || type === 'doughnut' || isMultipleDatasets,
        position: type === 'pie' || type === 'doughnut' ? 'bottom' : 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          color: '#555555',
          font: { size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 12,
        cornerRadius: 10,
        displayColors: isMultipleDatasets,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 13, weight: '500' },
        callbacks: {
          label: function(context: any) {
            const rawVal = context.parsed.y !== undefined ? context.parsed.y : (context.parsed.x !== undefined ? context.parsed.x : context.raw);
            let formattedVal = typeof rawVal === 'number' ? rawVal.toLocaleString('pt-BR') : rawVal;
            
            let unitSuffix = '';
            if (isMillionsContext && typeof rawVal === 'number' && rawVal < 1000) {
              unitSuffix = ' milhões';
            } else if (isPercentContext) {
              unitSuffix = '%';
            } else if (isCurrencyContext && !formattedVal.startsWith('R$')) {
              formattedVal = `R$ ${formattedVal}`;
            }

            const labelName = context.dataset.label || 'Valor';
            return ` ${labelName}: ${formattedVal}${unitSuffix}`;
          }
        }
      }
    },
    scales: (type === 'pie' || type === 'doughnut' || type === 'radar') ? undefined : {
      x: {
        beginAtZero: true,
        max: type === 'bar_horizontal' ? yAxisMax : undefined,
        suggestedMax: type === 'bar_horizontal' ? yAxisMax : undefined,
        border: { display: false },
        grid: { display: false },
        ticks: { 
          color: '#64748b', 
          font: { size: 12, weight: '500' },
          maxRotation: 0, // Keep state/category labels clean and horizontal!
          minRotation: 0,
          autoSkip: false,
          padding: 8
        },
        title: {
          display: Boolean(resolvedXLabel),
          text: resolvedXLabel,
          color: '#64748b',
          font: { size: 12, weight: '600' },
          padding: { top: 10 }
        }
      },
      y: {
        beginAtZero: true,
        max: type !== 'bar_horizontal' ? yAxisMax : undefined,
        suggestedMax: type !== 'bar_horizontal' ? yAxisMax : undefined,
        border: { display: false },
        grid: { color: '#f1f5f9', drawTicks: false },
        ticks: { 
          color: '#64748b', 
          padding: 10, 
          font: { size: 12 },
          callback: function(value: any) {
            if (typeof value === 'number') {
              if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toLocaleString('pt-BR') + 'B';
              if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toLocaleString('pt-BR') + 'M';
              if (Math.abs(value) >= 10_000) return (value / 1_000).toLocaleString('pt-BR') + 'k';
              
              // If context is millions and value is small (e.g. 10, 20, 30, 40, 50), add 'M' suffix
              if (isMillionsContext && Math.abs(value) > 0 && Math.abs(value) <= 1000) {
                return `${value.toLocaleString('pt-BR')}M`;
              }
              if (isCurrencyContext && Math.abs(value) > 0) {
                return `R$ ${value.toLocaleString('pt-BR')}`;
              }
              if (isPercentContext && Math.abs(value) > 0) {
                return `${value.toLocaleString('pt-BR')}%`;
              }
              return value.toLocaleString('pt-BR');
            }
            return value;
          }
        },
        title: {
          display: Boolean(resolvedYLabel),
          text: resolvedYLabel,
          color: '#475569',
          font: { size: 11, weight: '600' },
          align: 'center',
          padding: { bottom: 8, top: 4 }
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
    <div className="my-5 w-full max-w-full border border-gray-200/90 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm overflow-hidden transition-all">
      {(title || subtitle || resolvedYLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="m-0 text-base sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-neutral-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          {resolvedYLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <span>{resolvedYLabel}</span>
            </div>
          )}
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
