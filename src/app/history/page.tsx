"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, MoreHorizontal } from 'lucide-react';
import TokenIcon from '@/components/TokenIcon';
import { TOKENS_BY_SYMBOL } from '@/constants/tokens';
import Sidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';

export default function HistoryPage() {
  const [txs,     setTxs    ] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetch_ = async () => {
      const addr = localStorage.getItem('walletAddress');
      if (!addr) { router.push('/'); return; }
      try {
        const res  = await fetch(`/api/history?address=${addr}&limit=50`, { cache: 'no-store' });
        const data = await res.json();
        setTxs(data.items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-arc-bg text-arc-text">
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="pz-page-header flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <h1 className="text-2xl font-bold text-arc-text">Transaction History</h1>
          <div className="flex items-center gap-4">
            <button className="pz-btn pz-btn-primary pz-btn-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Data
            </button>
            <UserProfile />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          {loading ? (
            <div className="text-center py-10 text-arc-textMuted">
              Loading transactions…
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-10 text-arc-textMuted">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-arc-border">
                    <th className="py-3 px-4 text-xs font-semibold text-arc-textMuted">Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-arc-textMuted">Type</th>
                    <th className="py-3 px-4 text-xs font-semibold text-arc-textMuted">Asset</th>
                    <th className="py-3 px-4 text-xs font-semibold text-right text-arc-textMuted">Amount</th>
                    <th className="py-3 px-4 text-xs font-semibold hidden sm:table-cell text-arc-textMuted">Status</th>
                    <th className="py-3 px-4 hidden sm:table-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => {
                    const date  = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;
                    const isSuccess = tx.status === 'completed';
                    return (
                      <tr key={tx.id} className="border-b border-arc-border/50 last:border-0 hover:bg-arc-panelStrong/30 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-arc-text">{date}</td>
                        <td className="py-3 px-4 text-sm capitalize text-arc-text">{tx.type}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={token.symbol} logo={token.logo} size={20} />
                            <span className="text-sm font-medium text-arc-text">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-right text-arc-text">{tx.amountDisplay}</td>
                        <td className="py-3 px-4 text-sm font-medium hidden sm:table-cell">
                          <span className={isSuccess ? 'text-emerald-500' : 'text-red-500'}>
                            {isSuccess ? 'Confirmed' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right hidden sm:table-cell">
                          <button className="p-1 text-arc-textMuted hover:text-arc-text rounded">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
