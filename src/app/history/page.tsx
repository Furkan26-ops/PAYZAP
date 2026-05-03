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
    const fetchHistory = async () => {
      const storedAddr = localStorage.getItem('walletAddress');
      if (!storedAddr) { router.push('/'); return; }
      try {
        const res = await fetch(`/api/history?address=${storedAddr}&limit=50`, { cache: 'no-store' });
        if (!res.ok) throw new Error('History request failed');
        const data = await res.json();
        setTxs(data.items || []);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [router]);

  const typeIcon = (type: string) => {
    if (type === 'swap')    return <ArrowDownUp  className="w-4 h-4 text-violet-500" />;
    if (type === 'receive') return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    return                         <ArrowUpRight  className="w-4 h-4 text-blue-500" />;
  };

  const typeBadge = (type: string) => {
    if (type === 'swap')    return 'pz-badge-blue';
    if (type === 'receive') return 'pz-badge-green';
    return                         'pz-badge-yellow';
  };

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Transaction History</h1>
            <p className="text-sm text-[#64748B] mt-0.5">All on-chain activity for your wallet</p>
          </div>
          <button className="pz-btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export Data
          </button>
        </div>

        <div className="pz-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
              <RefreshCw className="animate-spin h-8 w-8 mb-3" />
              <p className="text-sm font-medium">Loading transactions…</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowDownLeft className="w-7 h-7 text-[#94A3B8]" />
              </div>
              <p className="font-semibold text-[#0F172A]">No transactions found.</p>
              <p className="text-sm mt-1 text-[#64748B]">On-chain activity will appear here.</p>
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
                            <span className="capitalize font-semibold text-[#0F172A]">{tx.title}</span>
                          </div>
                        </td>
                        <td className="text-xs text-[#64748B]">{date}</td>
                        <td><span className={typeBadge(tx.type)}>{tx.type}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={token.symbol} logo={token.logo} size={18} />
                            <span className="text-xs font-semibold">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="font-bold text-[#0F172A]">{tx.amountDisplay}</td>
                        <td>
                          <span className={tx.status === 'completed' ? 'pz-badge-green' : 'pz-badge-yellow'}>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                            title="View on ArcScan"
                          >
                            <ExternalLink className="w-4 h-4" />
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
