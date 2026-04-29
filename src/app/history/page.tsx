"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowDownUp, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import TokenIcon from '@/components/TokenIcon';
import { TOKENS_BY_SYMBOL } from '@/constants/tokens';

export default function HistoryPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const storedAddr = localStorage.getItem('walletAddress');
      if (!storedAddr) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`/api/history?address=${storedAddr}&limit=50`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('History request failed');
        const data = await response.json();
        setTxs(data.items || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto sm:my-10 overflow-hidden sm:rounded-[2.5rem] bg-white sm:shadow-2xl sm:shadow-indigo-500/10 border border-slate-100 flex flex-col min-h-screen sm:min-h-0 relative">
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center gap-4 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
          <Link href="/dashboard" className="p-3 -ml-3 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Finance History</h2>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-indigo-400">
                <RefreshCw className="animate-spin h-8 w-8 mb-4 opacity-50" />
                <p className="font-medium">Loading ledger...</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <ArrowDownLeft className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700">No wallet transactions found.</p>
                <p className="text-sm mt-2 text-slate-500">On-chain activity for the connected wallet will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {txs.map(tx => {
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const isSwap = tx.type === 'swap';
                const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;

                return (
                  <div key={tx.id} className="bg-white border border-slate-100 p-5 rounded-3xl hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl ${isSwap ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-700'} group-hover:scale-105 transition-transform flex items-center justify-center`}>
                          <TokenIcon symbol={token.symbol} logo={token.logo} size={28} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {tx.title}
                          </div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{formattedDate} at {formattedTime}</div>
                          <div className="text-xs text-slate-400 mt-1">{tx.subtitle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${isSwap ? 'text-teal-600' : 'text-slate-700'}`}>
                          {tx.amountDisplay}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-2xl p-4 text-xs font-medium space-y-3 text-slate-600 border border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Type:</span>
                            <span className="capitalize">{tx.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Status:</span>
                            <span className={`capitalize ${tx.status === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.status}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 mt-2">
                            <span className="text-slate-400">Transaction Hash:</span>
                            <a 
                                href={tx.explorerUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-mono text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1.5"
                            >
                                {tx.txHash.slice(0, 8)}... <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
