"use client";

import React from 'react';
import { Clock3 } from 'lucide-react';

export default function RecentActivityFeed({ recentTxs }: { recentTxs: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock3 className="w-5 h-5 text-arc-cyan" />
        <h2 className="text-lg font-bold text-arc-text">Recent Activity</h2>
      </div>
      <div className="glass-panel rounded-3xl p-5 space-y-4">
        {recentTxs.length === 0 ? (
          <div className="text-center py-8 text-arc-textMuted">No recent activity</div>
        ) : (
          recentTxs.map((tx, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-arc-border/50 last:border-0">
              <span className="text-sm text-arc-text">{tx.type}</span>
              <span className="text-sm font-medium text-arc-text">{tx.amountDisplay || '-'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
