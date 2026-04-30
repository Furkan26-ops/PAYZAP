"use client";

import React from 'react';
import { Activity, PieChart } from 'lucide-react';

export default function AnalyticsCharts({ flowSegments, sparkline }: { flowSegments: any[], sparkline: number[] }) {
  // Line chart calculations
  const max = Math.max(...sparkline, 100);
  const min = Math.min(...sparkline, 0);
  const range = max - min;
  
  const width = 300;
  const height = 100;
  
  const points = sparkline.map((val, i) => {
    const x = (i / (sparkline.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {/* Flow Breakdown */}
      <div className="glass-panel rounded-3xl p-6 h-48 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-arc-cyan" />
          <h2 className="text-lg font-bold text-arc-text">Activity Flow</h2>
        </div>
        <div className="flex-1 flex flex-col justify-end gap-3 pb-2">
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-arc-bg">
            {flowSegments.map((seg, i) => (
              <div 
                key={i} 
                style={{ width: `${seg.value}%` }} 
                className={`h-full ${seg.tone}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {flowSegments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${seg.tone}`} />
                <span className="text-xs font-medium text-arc-textMuted">{seg.label}</span>
                <span className="text-xs font-bold text-arc-text">{seg.value.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Line */}
      <div className="glass-panel rounded-3xl p-6 h-48 flex flex-col justify-between">
         <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-arc-cyan" />
            <h2 className="text-lg font-bold text-arc-text">Network Trend</h2>
          </div>
          <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
            +14%
          </div>
        </div>
        <div className="flex-1 w-full flex items-end relative overflow-hidden mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#06b6d4" // text-arc-cyan equivalent
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            />
            <polyline
              fill="url(#gradient)"
              stroke="none"
              points={`${width},${height} 0,${height} ${points}`}
            />
            <defs>
              <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
