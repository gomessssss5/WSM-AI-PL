import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

interface WsmChartComponentProps {
  key?: string;
  type: string;
  title?: string;
  data: string; // JSON string array of objects
}

const COLORS = ['#5c53e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

export default function WsmChartComponent({ type, title, data }: WsmChartComponentProps) {
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Invalid JSON for chart data:', e);
      return [];
    }
  }, [data]);

  if (!parsedData || parsedData.length === 0) {
    return (
      <div className="my-6 p-4 border border-gray-200 rounded-2xl bg-gray-50 flex items-center justify-center h-[300px]">
        <span className="text-gray-500 text-sm font-medium">Sem dados para exibir o gráfico.</span>
      </div>
    );
  }

  // Auto-detect keys if it's an array of objects
  const keys = Object.keys(parsedData[0]).filter(k => k !== 'name');

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #eae6e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
              <Pie
                data={parsedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value" // pie charts typically use 'value'
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-bold">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {parsedData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar_horizontal':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parsedData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
              <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: '1px solid #eae6e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              {keys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[0, 4, 4, 0]} barSize={24} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'bar_vertical':
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parsedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: '1px solid #eae6e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              {keys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} barSize={32} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={parsedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #eae6e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              {keys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 4, fill: COLORS[index % COLORS.length], strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Tipo de gráfico não suportado.
          </div>
        );
    }
  };

  return (
    <div className="my-6 border border-gray-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col w-full max-w-none">
      {title && (
        <div className="px-5 py-4 border-b border-gray-150 bg-gray-50/50">
          <h4 className="text-gray-800 font-semibold text-[15px] leading-tight">{title}</h4>
        </div>
      )}
      <div className="p-4 h-[350px] w-full">
        {renderChart()}
      </div>
    </div>
  );
}
