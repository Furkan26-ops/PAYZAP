"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight, ArrowDownLeft, ArrowDownUp, RefreshCw,
  X, ChevronRight, TrendingUp, Wallet, Bell,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import TokenIcon from '@/components/TokenIcon';
import Sidebar from '@/components/Sidebar';
import { TOKENS, TOKENS_BY_SYMBOL } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';

const ARC_CHAIN = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public:  { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
};

const ERC20_ABI = [{ constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' }] as const;

export default function Dashboard() {
  const [balance,         setBalance        ] = useState('0.00');
  const [address,         setAddress        ] = useState('');
  const [fullAddress,     setFullAddress    ] = useState('');
  const [loading,         setLoading        ] = useState(true);
  const [recentTxs,       setRecentTxs      ] = useState<any[]>([]);
  const [historyLoading,  setHistoryLoading ] = useState(true);
  const [heldTokens,      setHeldTokens     ] = useState<{ symbol: string; amount: string }[]>([]);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let addr = localStorage.getItem('walletAddress');
      if (session && !addr) {
        addr = '0x71C7656EC7ab88b098defB751B7401B5f6d897d0';
        localStorage.setItem('walletAddress', addr);
      }
      if (!addr) { router.push('/'); return; }
      setFullAddress(addr);
      setAddress(addr.slice(0, 6) + '…' + addr.slice(-4));
      fetchData(addr);
    };

    const fetchData = async (addr: string) => {
      try {
        const client = createPublicClient({ chain: ARC_CHAIN, transport: http() });
        const native  = await client.getBalance({ address: addr as `0x${string}` });
        let bal = parseFloat(formatEther(native)).toFixed(2);
        if (bal === '0.00' && addr === '0x71C7656EC7ab88b098defB751B7401B5f6d897d0') {
          bal = localStorage.getItem('demoBalance') ?? '100.00';
        } else { localStorage.setItem('demoBalance', bal); }
        setBalance(bal);

        // Token balances
        const results = await Promise.all(
          TOKENS.map(async (token) => {
            try {
              if (token.symbol === 'USDC') return { symbol: token.symbol, amount: Number(formatUnits(native, 18)) };
              const raw = await client.readContract({ address: token.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr as `0x${string}`] }) as bigint;
              return { symbol: token.symbol, amount: Number(formatUnits(raw, token.decimals)) };
            } catch { return { symbol: token.symbol, amount: 0 }; }
          })
        );
        setHeldTokens(
          results.filter(t => t.amount > 0).sort((a, b) => b.amount - a.amount)
                 .map(t => ({ symbol: t.symbol, amount: t.amount.toFixed(t.amount >= 1 ? 2 : 4) }))
        );
      } catch (e) { console.error(e); }
      setLoading(false);

      fetch(`/api/history?address=${addr}&limit=6`, { cache: 'no-store' })
        .then(r => r.json()).then(d => { setRecentTxs(d.items || []); setHistoryLoading(false); })
        .catch(() => setHistoryLoading(false));
    };

    init();
  }, [router]);

  const swapCount  = useMemo(() => recentTxs.filter(tx => tx.type === 'swap').length,  [recentTxs]);
  const sendCount  = useMemo(() => recentTxs.filter(tx => tx.type !== 'swap').length,  [recentTxs]);
  const totalFlow  = useMemo(() => recentTxs.reduce((s, tx) => {
    const n = parseFloat(String(tx.amountDisplay || '0').split(' ')[0].split('->')[0].trim());
    return s + (Number.isFinite(n) ? n : 0);
  }, 0), [recentTxs]);

  const quickActions = [
    { href: '/send',    icon: ArrowUpRight,  label: 'Send',    bg: '#EFF6FF', color: '#2563EB' },
    { href: '/swap',    icon: ArrowDownUp,   label: 'Swap',    bg: '#F5F3FF', color: '#7C3AED' },
    { href: '/request', icon: ArrowDownLeft, label: 'Receive', bg: '#ECFDF5', color: '#059669' },
    { href: '/history', icon: RefreshCw,     label: 'History', bg: '#FFFBEB', color: '#B45309' },
  ];

  const typeBadge = (type: string) =>
    type === 'swap' ? 'pz-badge pz-badge-violet' :
    type === 'receive' ? 'pz-badge pz-badge-green' : 'pz-badge pz-badge-blue';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <main className="pz-shell flex-1">
        {/* ── Top bar ── */}
        <div className="pz-page-header">
          <div>
            <h1 className="pz-page-title">Dashboard</h1>
            <p className="pz-page-subtitle">Welcome back to PAYZAP</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="pz-btn pz-btn-ghost pz-btn-sm w-9 h-9 !p-0 rounded-full">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 bg-white border border-[#E2E8F0] rounded-full pl-1 pr-4 py-1 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {address ? address.slice(2, 4).toUpperCase() : 'PZ'}
              </div>
              <span className="text-sm font-semibold text-[#334155]">{address || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Balance + Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
          {/* Main balance card */}
          <div className="lg:col-span-2 pz-card" style={{ background: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200 mb-1">Wallet Balance</p>
            <div className="flex items-baseline gap-1 mb-1">
              {loading ? (
                <RefreshCw className="w-7 h-7 animate-spin text-white/40" />
              ) : (
                <><span className="text-2xl font-bold text-blue-200">$</span><span className="text-5xl font-extrabold text-white tracking-tight">{balance}</span></>
              )}
            </div>
            <p className="text-xs text-blue-300 mb-6">in crypto assets</p>
            <div className="flex gap-2.5">
              <Link href="/send"    className="pz-btn pz-btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', backdropFilter:'blur(4px)' }}>
                <ArrowUpRight className="w-3.5 h-3.5" /> Send
              </Link>
              <Link href="/swap"    className="pz-btn pz-btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', backdropFilter:'blur(4px)' }}>
                <ArrowDownUp className="w-3.5 h-3.5" /> Swap
              </Link>
              <Link href="/request" className="pz-btn pz-btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', backdropFilter:'blur(4px)' }}>
                <ArrowDownLeft className="w-3.5 h-3.5" /> Receive
              </Link>
            </div>
          </div>

          {/* Volume */}
          <div className="pz-card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="pz-stat-label">Volume</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="pz-stat-value">${totalFlow.toFixed(2)}</div>
            <span className="pz-chip mt-auto w-fit mt-3">Recent</span>
          </div>

          {/* Swaps & Transfers */}
          <div className="pz-card flex flex-col gap-3 justify-between">
            <div>
              <span className="pz-stat-label">Swaps</span>
              <div className="pz-stat-value">{swapCount}</div>
            </div>
            <hr className="pz-divider !my-0" />
            <div>
              <span className="pz-stat-label">Transfers</span>
              <div className="pz-stat-value">{sendCount}</div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {quickActions.map(({ href, icon: Icon, label, bg, color }) => (
            <Link key={href} href={href}
              className="pz-card flex flex-col items-center gap-3 py-5 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Tokens + Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tokens Held */}
          <div className="pz-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Tokens Held</h3>
              <button onClick={() => setShowTokensModal(true)}
                className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-11 rounded-lg animate-pulse" style={{ background:'var(--border-2)' }} />)}
              </div>
            ) : heldTokens.length > 0 ? (
              <div className="space-y-1">
                {heldTokens.slice(0, 4).map(token => {
                  const meta = TOKENS_BY_SYMBOL[token.symbol];
                  return (
                    <div key={token.symbol} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border-2)' }}>
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={token.symbol} logo={meta?.logo} size={28} />
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{token.symbol}</div>
                          <div className="text-xs" style={{ color: 'var(--muted)' }}>{meta?.name || token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{token.amount}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'var(--muted-2)' }}>No tokens detected.</p>
            )}

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Connected Wallet</p>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>{address || '—'}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="pz-card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Recent Activity</h3>
              <Link href="/history" className="text-xs font-semibold text-[#2563EB] hover:underline">View all</Link>
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background:'var(--border-2)' }} />)}
              </div>
            ) : recentTxs.length === 0 ? (
              <div className="text-center py-10" style={{ color: 'var(--muted-2)' }}>
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transactions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="pz-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTxs.map(tx => {
                      const date  = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;
                      return (
                        <tr key={tx.id}>
                          <td className="text-xs" style={{ color: 'var(--muted)' }}>{date}</td>
                          <td><span className={typeBadge(tx.type)}>{tx.type}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <TokenIcon symbol={token.symbol} logo={token.logo} size={18} />
                              <span className="text-xs font-semibold">{token.symbol}</span>
                            </div>
                          </td>
                          <td className="font-bold text-xs">{tx.amountDisplay}</td>
                          <td>
                            <span className={tx.status === 'completed' ? 'pz-badge pz-badge-green' : 'pz-badge pz-badge-amber'}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Tokens Modal */}
      {showTokensModal && (
        <div className="pz-modal-overlay">
          <div className="pz-modal-backdrop" onClick={() => setShowTokensModal(false)} />
          <div className="pz-modal animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>All Tokens Held</h3>
              <button onClick={() => setShowTokensModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {heldTokens.length > 0 ? heldTokens.map(token => {
                const meta = TOKENS_BY_SYMBOL[token.symbol];
                return (
                  <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} logo={meta?.logo} size={28} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{token.symbol}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{meta?.name || token.symbol}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{token.amount}</div>
                  </div>
                );
              }) : <p className="text-center text-sm py-8" style={{ color: 'var(--muted-2)' }}>No tokens detected.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
