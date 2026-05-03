"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, MoreHorizontal } from 'lucide-react';
import TokenIcon from '@/components/TokenIcon';
import { TOKENS_BY_SYMBOL } from '@/constants/tokens';
import Sidebar from '@/components/Sidebar';

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
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="pz-page-header">
          <h1 className="pz-page-title">Transaction History</h1>
          <button className="pz-btn pz-btn-primary pz-btn-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Data
          </button>
        </div>

        <div className="pz-card">
          {loading ? (
            <div className="text-center py-10" style={{ color: 'var(--muted-2)' }}>
              Loading transactions…
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--muted-2)' }}>
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-3 px-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Date</th>
                    <th className="py-3 px-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Type</th>
                    <th className="py-3 px-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Asset</th>
                    <th className="py-3 px-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Amount</th>
                    <th className="py-3 px-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => {
                    const date  = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;
                    const isSuccess = tx.status === 'completed';
                    return (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors" style={{ borderColor: 'var(--border-2)' }}>
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--text)' }}>{date}</td>
                        <td className="py-3 px-4 text-sm capitalize" style={{ color: 'var(--text)' }}>{tx.type}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={token.symbol} logo={token.logo} size={20} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{token.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--text)' }}>{tx.amountDisplay}</td>
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: isSuccess ? 'var(--success)' : 'var(--danger)' }}>
                          {isSuccess ? 'Confirmed' : 'Failed'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  Export Data &lt; &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
