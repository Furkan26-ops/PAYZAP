"use client";

import React from 'react';

export default function AnalyticsCharts({ flowSegments, sparkline }: { flowSegments: any[], sparkline: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <div className="glass-panel rounded-3xl p-5 h-48 flex items-center justify-center">
        <span className="text-arc-textMuted text-sm">Analytics flow preview...</span>
      </div>
      <div className="glass-panel rounded-3xl p-5 h-48 flex items-center justify-center">
        <span className="text-arc-textMuted text-sm">Trend preview...</span>
      </div>
    </div>
  );
}
