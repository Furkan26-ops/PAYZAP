"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, ArrowDownUp, ExternalLink, RefreshCw, Download } from 'lucide-react';
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

  const typeIcon = (t: string) =>
    t === 'swap'    ? <ArrowDownUp  className="w-4 h-4" style={{ color: '#7C3AED' }} /> :
    t === 'receive' ? <ArrowDownLeft className="w-4 h-4" style={{ color: '#059669' }} /> :
                      <ArrowUpRight  className="w-4 h-4" style={{ color: '#2563EB' }} />;

  const typeBadge = (t: string) =>
    t === 'swap' ? 'pz-badge pz-badge-violet' : t === 'receive' ? 'pz-badge pz-badge-green' : 'pz-badge pz-badge-blue';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="pz-page-header">
          <div>
            <h1 className="pz-page-title">Transaction History</h1>
            <p className="pz-page-subtitle">All on-chain activity for your wallet</p>
          </div>
          <button className="pz-btn pz-btn-secondary pz-btn-sm">
            <Download className="w-4 h-4" /> Export Data
          </button>
        </div>

        <div className="pz-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--muted-2)' }}>
              <RefreshCw className="animate-spin h-7 w-7 mb-3 opacity-40" />
              <p className="text-sm font-medium">Loading transactions…</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--border-2)' }}>
                <ArrowDownLeft className="w-7 h-7" style={{ color: 'var(--muted-2)' }} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>No transactions found.</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>On-chain activity will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="pz-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Asset</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => {
                    const date  = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;
                    return (
                      <tr key={tx.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            {typeIcon(tx.type)}
                            <span className="font-semibold capitalize text-sm" style={{ color: 'var(--text)' }}>{tx.title}</span>
                          </div>
                        </td>
                        <td className="text-xs" style={{ color: 'var(--muted)' }}>{date}</td>
                        <td><span className={typeBadge(tx.type)}>{tx.type}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={token.symbol} logo={token.logo} size={18} />
                            <span className="text-xs font-semibold">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="font-bold text-sm">{tx.amountDisplay}</td>
                        <td>
                          <span className={tx.status === 'completed' ? 'pz-badge pz-badge-green' : 'pz-badge pz-badge-amber'}>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors inline-flex" title="View on ArcScan">
                            <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                          </a>
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
