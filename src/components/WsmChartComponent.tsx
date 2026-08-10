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

export default function WsmChartComponent({ type, title, subtitle, data }: WsmChartComponentProps) {
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

        const labelKey = keys.find(k => ['name', 'label', 'categoria', 'mes', 'mês', 'ano', 'item'].includes(k.toLowerCase())) || keys[0];
        const numericKeys = keys.filter(k => k !== labelKey && typeof first[k] === 'number');

        const labels = raw.map(item => String(item[labelKey] ?? ''));

        if (type === 'pie' || type === 'doughnut') {
          const valueKey = numericKeys[0] || keys[1] || keys[0];
          return {
            labels,
            datasets: [{
              data: raw.map(item => Number(item[valueKey] ?? 0)),
              backgroundColor: PALETTE.slice(0, labels.length),
              borderColor: '#ffffff',
              borderWidth: 3,
              hoverOffset: 8
            }]
          };
        }

        // Bar or Line chart with 1 or more datasets
        if (numericKeys.length > 0) {
          const datasets = numericKeys.map((key, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            return {
              label: key.charAt(0).toUpperCase() + key.slice(1),
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
          return { labels, datasets };
        } else {
          // Fallback if all values are simple numbers
          const valueKey = keys[1] || keys[0];
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
            }]
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
        ticks: { color: '#888888', font: { size: 12 } }
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#f1f1f1', drawTicks: false },
        ticks: { color: '#888888', padding: 8, font: { size: 12 } }
      }
    }
  };

  const renderChartCanvas = () => {
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
      case 'pie':
        return <Pie data={chartData} options={baseOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={baseOptions} />;
      case 'bar_horizontal':
        return <Bar data={chartData} options={{ ...baseOptions, indexAxis: 'y' as const }} />;
      case 'bar_vertical':
      case 'bar':
        return <Bar data={chartData} options={baseOptions} />;
      case 'radar':
        return <Radar data={chartData} options={baseOptions} />;
      case 'line':
      default:
        return <Line data={chartData} options={baseOptions} />;
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
      <div className="relative w-full h-[320px] sm:h-[380px]">
        {renderChartCanvas()}
      </div>
    </div>
  );
}
