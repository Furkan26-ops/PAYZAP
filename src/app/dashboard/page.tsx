"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight, ArrowDownLeft, ArrowDownUp, RefreshCw,
  X, ChevronRight, TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import TokenIcon from '@/components/TokenIcon';
import Sidebar from '@/components/Sidebar';
import { TOKENS, TOKENS_BY_SYMBOL } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';

const RecentActivityFeed = dynamic(() => import('@/components/RecentActivityFeed'), { ssr: false });

export default function Dashboard() {
  const [balance,        setBalance       ] = useState<string>('0.00');
  const [address,        setAddress       ] = useState<string>('');
  const [loading,        setLoading       ] = useState(true);
  const [recentTxs,      setRecentTxs     ] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [heldTokens,     setHeldTokens    ] = useState<Array<{ symbol: string; amount: string }>>([]);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async (storedAddress: string) => {
      try {
        const client = createPublicClient({
          chain: {
            id: 5042002,
            name: 'Arc Testnet',
            nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://rpc.testnet.arc.network'] },
              public:  { http: ['https://rpc.testnet.arc.network'] },
            },
            blockExplorers: {
              default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
            },
          },
          transport: http(),
        });

        const nativeBalance = await client.getBalance({ address: storedAddress as `0x${string}` });
        let displayBalance  = parseFloat(formatEther(nativeBalance)).toFixed(2);

        if (displayBalance === '0.00' && storedAddress === '0x71C7656EC7ab88b098defB751B7401B5f6d897d0') {
          const saved = localStorage.getItem('demoBalance');
          displayBalance = saved ? parseFloat(saved).toFixed(2) : '100.00';
        } else {
          localStorage.setItem('demoBalance', displayBalance);
        }

        try {
          const tokenBalances = await Promise.all(
            TOKENS.map(async (token) => {
              try {
                if (token.symbol === 'USDC') {
                  const native = await client.getBalance({ address: storedAddress as `0x${string}` });
                  return { symbol: token.symbol, amount: Number(formatUnits(native, 18)) };
                }
                const raw = await client.readContract({
                  address: token.address,
                  abi: [{ constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' }],
                  functionName: 'balanceOf',
                  args: [storedAddress as `0x${string}`],
                }) as bigint;
                return { symbol: token.symbol, amount: Number(formatUnits(raw, token.decimals)) };
              } catch { return { symbol: token.symbol, amount: 0 }; }
            })
          );
          setHeldTokens(
            tokenBalances
              .filter(t => t.amount > 0)
              .sort((a, b) => b.amount - a.amount)
              .map(t => ({ symbol: t.symbol, amount: t.amount.toFixed(t.amount >= 1 ? 2 : 4) }))
          );
        } catch (e) { console.error('Token balances error', e); }

        setBalance(displayBalance);
        setAddress(storedAddress.slice(0, 6) + '...' + storedAddress.slice(-4));
        setLoading(false);

        fetch(`/api/history?address=${storedAddress}&limit=6`, { cache: 'no-store' })
          .then(r => r.json())
          .then(d => { setRecentTxs(d.items || []); setHistoryLoading(false); })
          .catch(() => setHistoryLoading(false));
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let addr = localStorage.getItem('walletAddress');
      if (session && !addr) {
        addr = '0x71C7656EC7ab88b098defB751B7401B5f6d897d0';
        localStorage.setItem('walletAddress', addr);
        localStorage.setItem('loginMethod', 'discord');
      }
      if (!addr) { router.push('/'); return; }
      fetchDashboardData(addr);
    };

    init();
  }, [router]);

  const swapCount      = useMemo(() => recentTxs.filter(tx => tx.type === 'swap').length,   [recentTxs]);
  const sendCount      = useMemo(() => recentTxs.filter(tx => tx.type !== 'swap').length,   [recentTxs]);
  const heldTokenCount = useMemo(() => heldTokens.length, [heldTokens]);
  const heldTokenPreview = useMemo(() => heldTokens.slice(0, 3), [heldTokens]);
  const totalFlow      = useMemo(() => recentTxs.reduce((sum, tx) => {
    const parsed = parseFloat(String(tx.amountDisplay || '0').split(' ')[0].split('->')[0].trim());
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0), [recentTxs]);

  const quickActions = [
    { href: '/send',    icon: ArrowUpRight,  label: 'Send',    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'    },
    { href: '/swap',    icon: ArrowDownUp,   label: 'Swap',    color: 'bg-violet-50 text-violet-600 hover:bg-violet-100'},
    { href: '/request', icon: ArrowDownLeft, label: 'Receive', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'},
    { href: '/history', icon: RefreshCw,     label: 'History', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100'  },
  ];

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <Sidebar />

      <main className="pz-shell flex-1">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#64748B] mt-0.5">Welcome back — Arc Testnet</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-full px-4 py-2 shadow-sm">
              {loading ? '...' : address}
            </span>
            <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold shadow">
              {address ? address.slice(2, 4).toUpperCase() : 'PZ'}
            </div>
          </div>
        </div>

        {/* ── Balance + Stats row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
          {/* Balance Card */}
          <div className="lg:col-span-2 pz-card">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B] mb-1">Treasury Balance</p>
            <div className="text-5xl font-extrabold text-[#0F172A] tracking-tight flex items-baseline gap-1">
              {loading ? (
                <RefreshCw className="w-8 h-8 animate-spin text-[#CBD5E1]" />
              ) : (
                <><span className="text-3xl text-[#64748B] font-bold">$</span>{balance}</>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-2">in crypto assets</p>
            <div className="flex gap-3 mt-5">
              <Link href="/send" className="pz-btn-primary text-sm">
                <ArrowUpRight className="w-4 h-4" /> Send
              </Link>
              <Link href="/swap" className="pz-btn-secondary text-sm">
                <ArrowDownUp className="w-4 h-4" /> Swap
              </Link>
            </div>
          </div>

          {/* Volume */}
          <div className="pz-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Volume</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A]">${totalFlow.toFixed(2)}</div>
            <span className="pz-chip mt-3 w-fit">Recent activity</span>
          </div>

          {/* Swaps + Transfers */}
          <div className="pz-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#64748B]">Swaps</span>
              <span className="text-xl font-extrabold text-[#0F172A]">{swapCount}</span>
            </div>
            <hr className="border-[#E2E8F0]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#64748B]">Transfers</span>
              <span className="text-xl font-extrabold text-[#0F172A]">{sendCount}</span>
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {quickActions.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`pz-card flex flex-col items-center gap-3 py-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${color}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Tokens Held + Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tokens Held */}
          <div className="pz-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0F172A]">Tokens Held</h3>
              <button
                onClick={() => setShowTokensModal(true)}
                className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-[#F1F5F9] rounded-lg animate-pulse" />)}
              </div>
            ) : heldTokenPreview.length > 0 ? (
              <div className="space-y-3">
                {heldTokenPreview.map(token => {
                  const meta = TOKENS_BY_SYMBOL[token.symbol];
                  return (
                    <div key={token.symbol} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={token.symbol} logo={meta?.logo} size={28} />
                        <div>
                          <div className="text-sm font-bold text-[#0F172A]">{token.symbol}</div>
                          <div className="text-xs text-[#64748B]">{meta?.name || token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[#0F172A]">{token.amount}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] text-center py-6">No tokens detected.</p>
            )}

            {/* Wallet address */}
            <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
              <p className="text-xs text-[#64748B] font-medium mb-1">Wallet</p>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-xs font-mono text-[#0F172A]">{address || '—'}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="pz-card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0F172A]">Recent Activity</h3>
              <Link href="/history" className="text-xs font-semibold text-[#2563EB] hover:underline">View all</Link>
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-[#F1F5F9] rounded-lg animate-pulse" />)}
              </div>
            ) : recentTxs.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8] text-sm">No transactions yet.</div>
            ) : (
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
                    const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const token = TOKENS_BY_SYMBOL[tx.tokenSymbol] || TOKENS_BY_SYMBOL.USDC;
                    const isSwap = tx.type === 'swap';
                    return (
                      <tr key={tx.id}>
                        <td className="text-xs text-[#64748B]">{date}</td>
                        <td>
                          <span className={isSwap ? 'pz-badge-blue' : 'pz-badge-green'}>
                            {tx.type}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={token.symbol} logo={token.logo} size={18} />
                            <span className="text-xs font-semibold">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="font-semibold text-[#0F172A] text-xs">{tx.amountDisplay}</td>
                        <td>
                          <span className={tx.status === 'completed' ? 'pz-badge-green' : 'pz-badge-yellow'}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Tokens Modal */}
      {showTokensModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTokensModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-[#0F172A]">All Tokens Held</h3>
              <button onClick={() => setShowTokensModal(false)} className="p-1.5 rounded-full hover:bg-[#F1F5F9] text-[#64748B] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {heldTokens.length > 0 ? heldTokens.map(token => {
                const meta = TOKENS_BY_SYMBOL[token.symbol];
                return (
                  <div key={token.symbol} className="flex items-center justify-between border border-[#E2E8F0] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} logo={meta?.logo} size={28} />
                      <div>
                        <div className="text-sm font-bold text-[#0F172A]">{token.symbol}</div>
                        <div className="text-xs text-[#64748B]">{meta?.name || token.symbol}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#0F172A]">{token.amount}</div>
                  </div>
                );
              }) : (
                <p className="text-center text-[#94A3B8] text-sm py-8">No tokens detected.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
