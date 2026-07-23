import React from 'react';

export interface ModelScore {
  name: string;
  score: number;
  isWsm?: boolean;
}

interface BenchmarkChartProps {
  categoryTitle: string;
  data: ModelScore[];
  subtitle?: string;
}

export default function BenchmarkChart({ categoryTitle, data, subtitle }: BenchmarkChartProps) {
  const maxScore = 100;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
        <div>
          <h4 className="font-bold text-gray-900 text-[14px] sm:text-[15px]">{categoryTitle}</h4>
        </div>
      </div>

      {/* Bars list */}
      <div className="flex flex-col gap-2">
        {data.map((item, idx) => {
          const rank = idx + 1;
          const percentage = Math.min(100, Math.max(0, (item.score / maxScore) * 100));

          return (
            <div 
              key={item.name + idx}
              className={`flex items-center gap-2 sm:gap-3 py-1 px-2 rounded-lg transition-colors ${
                item.isWsm ? 'bg-orange-50/70 border border-orange-200/80' : 'hover:bg-gray-50/60'
              }`}
            >
              {/* Rank */}
              <span className={`text-[11px] font-semibold min-w-[18px] text-right ${
                item.isWsm ? 'text-orange-600 font-bold' : rank <= 3 ? 'text-gray-900' : 'text-gray-400'
              }`}>
                #{rank}
              </span>

              {/* Model Name */}
              <div className="min-w-[110px] max-w-[140px] sm:min-w-[130px] sm:max-w-[160px] truncate flex items-center gap-1.5">
                {item.isWsm && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                )}
                <span className={`text-[11px] sm:text-[12px] truncate ${
                  item.isWsm ? 'font-bold text-orange-700' : 'font-medium text-gray-700'
                }`}>
                  {item.name}
                </span>
              </div>

              {/* Bar Track */}
              <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.isWsm 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-xs' 
                      : rank === 1 
                        ? 'bg-blue-600' 
                        : rank <= 3 
                          ? 'bg-sky-500' 
                          : 'bg-slate-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Score Value */}
              <span className={`text-[11px] sm:text-[12px] font-bold min-w-[34px] text-right ${
                item.isWsm ? 'text-orange-600 font-black' : 'text-gray-800'
              }`}>
                {item.score.toFixed(item.score % 1 === 0 ? 0 : 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
