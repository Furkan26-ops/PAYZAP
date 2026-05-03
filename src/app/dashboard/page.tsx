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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const inflowData = [
  { month: 'JAN', amount: 4000 },
  { month: 'FEB', amount: 8000 },
  { month: 'MAR', amount: 10000 },
  { month: 'APR', amount: 4500 },
  { month: 'MAY', amount: 9000 },
  { month: 'JUN', amount: 8500 },
  { month: 'JUL', amount: 3000 },
];

const outflowData = [
  { month: 'JAN', amount: 8000 },
  { month: 'FEB', amount: 5000 },
  { month: 'MAR', amount: 2000 },
  { month: 'APR', amount: 10000 },
  { month: 'MAY', amount: 3000 },
  { month: 'JUN', amount: 4000 },
  { month: 'JUL', amount: 1000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-md rounded-lg p-2 border border-slate-100">
        <p className="text-sm font-bold text-slate-800">${payload[0].value.toLocaleString()}</p>
        <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
      </div>
    );
  }
  return null;
};

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
    { href: '/send',    icon: ArrowUpRight,  label: 'Send',    bg: 'var(--blue-soft)',   color: 'var(--blue)' },
    { href: '/swap',    icon: ArrowDownUp,   label: 'Swap',    bg: 'var(--violet-soft)', color: 'var(--violet)' },
    { href: '/request', icon: ArrowDownLeft, label: 'Receive', bg: 'var(--green-soft)',  color: 'var(--green)' },
    { href: '/history', icon: RefreshCw,     label: 'History', bg: 'var(--amber-soft)',  color: 'var(--amber)' },
  ];

  const typeBadge = (type: string) =>
    type === 'swap' ? 'pz-badge pz-badge-violet' :
    type === 'receive' ? 'pz-badge pz-badge-green' : 'pz-badge pz-badge-blue';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <main className="pz-shell flex-1">
        {/* ── Top bar ── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Welcome back to PAYZAP</p>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                <RefreshCw className="w-3 h-3" /> Just updated
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative pz-btn pz-btn-ghost pz-btn-sm w-10 h-10 !p-0 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
              <Bell className="w-4 h-4 text-slate-600" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-white"></div>
            </button>
            <div className="flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm bg-white border border-slate-200">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--blue)' }}>
                {address ? address.slice(2, 4).toUpperCase() : 'PZ'}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{address || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Vertical Main Feed ── */}
        <div className="max-w-2xl space-y-6">
          
          {/* Main Balance Card */}
          <div className="pz-card relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Treasury Balance</p>
                <div className="flex items-baseline gap-1 mb-1">
                  {loading ? (
                    <RefreshCw className="w-7 h-7 animate-spin opacity-40" style={{ color: 'var(--muted)' }} />
                  ) : (
                    <><span className="text-2xl font-bold" style={{ color: 'var(--text)' }}>$</span><span className="text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>{balance}</span></>
                  )}
                </div>
                <p className="text-xs font-medium" style={{ color: 'var(--muted-2)' }}>in crypto assets</p>
              </div>
              <div className="flex gap-2">
                <Link href="/send" className="pz-btn pz-btn-primary pz-btn-sm shadow-md hover:shadow-lg">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Send
                </Link>
                <Link href="/swap" className="pz-btn pz-btn-primary pz-btn-sm shadow-md hover:shadow-lg">
                  <ArrowDownUp className="w-3.5 h-3.5" /> Swap
                </Link>
              </div>
            </div>

            {/* Quick summary rows (matching mockup) */}
            <div className="space-y-4">
              {[
                { icon: '💰', date: 'Oct 1, 2022', val: '$395.77', color: 'var(--text)', bg: '#FEF3C7' },
                { icon: '💰', date: 'Oct 1, 2022', val: '$100,000', color: 'var(--text)', bg: '#FEF3C7' },
                { icon: '💸', date: 'BTC cash', val: '-$15,000', color: 'var(--danger)', bg: '#E0E7FF' },
                { icon: '🪙', date: 'Oct 1, 2021', val: '-$5,000', color: 'var(--text)', bg: '#F1F5F9' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: row.bg }}>{row.icon}</div>
                    <span className="text-sm font-bold text-slate-800">{row.date}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="pz-card">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-slate-900">Inflow</span>
              <span className="text-xs font-bold" style={{ color: 'var(--success)' }}>+ 11 Inflow</span>
            </div>
            <div className="h-40 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inflowData} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="amount" fill="url(#colorInflow)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pz-card">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-slate-900">Outflow</span>
              <span className="text-xs font-bold" style={{ color: 'var(--danger)' }}>- Outflow</span>
            </div>
            <div className="h-40 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outflowData} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FCA5A5" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="amount" fill="url(#colorOutflow)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Log */}
          <div className="pz-card">
            <div className="flex justify-between text-xs font-bold mb-6 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              <span>Recent activity</span>
              <span>Summary</span>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600 shadow-sm border border-green-200">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 mb-0.5">Received USDC</div>
                    <div className="text-xs font-medium text-slate-500">From 0x1a...f4B</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">+$100,000</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 shadow-sm border border-blue-200">
                    <ArrowDownUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 mb-0.5">Swap USDC for EURC</div>
                    <div className="text-xs font-medium text-slate-500">Arc Testnet Dex</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">-$15,000</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-600 shadow-sm border border-red-200">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 mb-0.5">Sent USDC</div>
                    <div className="text-xs font-medium text-slate-500">To 0x89...2Da</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">-$5,000</span>
              </div>
            </div>
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
