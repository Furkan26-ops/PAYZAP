"use client";

import Image from 'next/image';
import { useEffect, useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { History, ArrowDownLeft, ArrowUpRight, Zap, RefreshCw, LogOut, ArrowDownUp, TrendingUp, Activity, Clock3, CheckCircle2, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import TokenIcon from '@/components/TokenIcon';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TOKENS, TOKENS_BY_SYMBOL } from '@/constants/tokens';
import { supabase } from '@/lib/supabase';

const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), { ssr: false });
const RecentActivityFeed = dynamic(() => import('@/components/RecentActivityFeed'), { ssr: false });

export default function Dashboard() {
  const [balance, setBalance] = useState<string>('0.00');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [heldTokens, setHeldTokens] = useState<Array<{ symbol: string; amount: string }>>([]);
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
              public: { http: ['https://rpc.testnet.arc.network'] },
            },
            blockExplorers: {
              default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
            },
          },
          transport: http()
        });
        
        // Fetch native token balance (which is USDC on Arc Testnet)
        const nativeBalance = await client.getBalance({ address: storedAddress as `0x${string}` });
        let displayBalance = parseFloat(formatEther(nativeBalance)).toFixed(2);
        
        // UX Fallback
        if (displayBalance === '0.00' && storedAddress === '0x71C7656EC7ab88b098defB751B7401B5f6d897d0') {
           const savedBalance = localStorage.getItem('demoBalance');
           displayBalance = savedBalance ? parseFloat(savedBalance).toFixed(2) : '100.00';
        } else {
           localStorage.setItem('demoBalance', displayBalance);
        }

        try {
          const tokenBalances = await Promise.all(
            TOKENS.map(async (token) => {
              try {
                if (token.symbol === 'USDC') {
                  const native = await client.getBalance({ address: storedAddress as `0x${string}` });
                  const amount = Number(formatUnits(native, 18));
                  return { symbol: token.symbol, amount };
                }

                const raw = await client.readContract({
                  address: token.address,
                  abi: [{
                    constant: true,
                    inputs: [{ name: '_owner', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ name: 'balance', type: 'uint256' }],
                    type: 'function',
                  }],
                  functionName: 'balanceOf',
                  args: [storedAddress as `0x${string}`],
                }) as bigint;

                return {
                  symbol: token.symbol,
                  amount: Number(formatUnits(raw, token.decimals)),
                };
              } catch {
                return { symbol: token.symbol, amount: 0 };
              }
            })
          );

          setHeldTokens(
            tokenBalances
              .filter((token) => token.amount > 0)
              .sort((a, b) => b.amount - a.amount)
              .map((token) => ({
                symbol: token.symbol,
                amount: token.amount.toFixed(token.amount >= 1 ? 2 : 4),
              }))
          );
        } catch (e) {
          console.error('Failed to fetch wallet token balances', e);
        }

        setBalance(displayBalance);
        setAddress(storedAddress.slice(0, 6) + '...' + storedAddress.slice(-4));
        setLoading(false);

        fetch(`/api/history?address=${storedAddress}&limit=6`, { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            setRecentTxs(data.items || []);
            setHistoryLoading(false);
          })
          .catch(e => {
            console.error("Failed to fetch history", e);
            setHistoryLoading(false);
          });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    const initializeDashboard = async () => {
      // 1. Check if we just returned from Discord OAuth
      const { data: { session } } = await supabase.auth.getSession();
      
      let storedAddr = localStorage.getItem('walletAddress');

      if (session && !storedAddr) {
        // Mock Backend: User successfully authenticated with Discord!
        // Here your backend would normally call Circle API to get/create their Developer Wallet.
        storedAddr = '0x71C7656EC7ab88b098defB751B7401B5f6d897d0'; // Mock Circle Wallet
        localStorage.setItem('walletAddress', storedAddr);
        localStorage.setItem('loginMethod', 'discord');
      }

      if (!storedAddr) {
        router.push('/');
      } else {
        fetchDashboardData(storedAddr);
      }
    };

    initializeDashboard();
  }, [router]);

  const handleDisconnect = () => {
    localStorage.removeItem('walletAddress');
    router.push('/');
  };

  const formattedDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const swapCount = useMemo(() => recentTxs.filter((tx) => tx.type === 'swap').length, [recentTxs]);
  const sendCount = useMemo(() => recentTxs.filter((tx) => tx.type !== 'swap').length, [recentTxs]);
  const heldTokenCount = useMemo(() => heldTokens.length, [heldTokens]);
  const heldTokenPreview = useMemo(() => heldTokens.slice(0, 3), [heldTokens]);
  const totalFlow = useMemo(() => recentTxs.reduce((sum, tx) => {
    const parsed = parseFloat(String(tx.amountDisplay || '0').split(' ')[0].split('->')[0].trim());
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0), [recentTxs]);
  const flowSegments = useMemo(() => totalFlow > 0
    ? [
        { label: 'Swaps', value: (swapCount / Math.max(recentTxs.length, 1)) * 100, tone: 'bg-sky-500' },
        { label: 'Transfers', value: (sendCount / Math.max(recentTxs.length, 1)) * 100, tone: 'bg-amber-500' },
      ]
    : [
        { label: 'Swaps', value: 50, tone: 'bg-sky-500' },
        { label: 'Transfers', value: 50, tone: 'bg-amber-500' },
      ], [totalFlow, swapCount, sendCount, recentTxs.length]);
  const sparkline = [58, 62, 64, 61, 66, 68, 72];
  const actions = [
    { href: '/send', icon: ArrowUpRight, title: 'Send', desc: 'Initiate outflows to recipients.', tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { href: '/swap', icon: ArrowDownUp, title: 'Swap', desc: 'Instantly swap tokens on Arc.', tone: 'text-arc-cyan bg-cyan-500/10 border-cyan-500/20' },
    { href: '/request', icon: ArrowDownLeft, title: 'Request', desc: 'Generate inbound payment requests.', tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { href: '/history', icon: History, title: 'History', desc: 'Review recorded activity and status.', tone: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ];

  return (
    <div className="arc-app-shell min-h-screen pb-20 sm:pb-0 font-sans selection:bg-cyan-500/30 text-arc-text">
      <div className="max-w-3xl mx-auto sm:my-10 overflow-hidden sm:rounded-[2.5rem] flex flex-col min-h-screen sm:min-h-0 relative bg-arc-panel backdrop-blur-3xl border border-arc-border shadow-2xl">
        
        {/* Defined Header Navigation Area */}
        <div className="arc-header-gradient px-8 pt-10 pb-8 relative overflow-hidden shadow-lg border-b border-arc-border">
          <div className="absolute inset-0 arc-grid opacity-20"></div>
          
          <div className="relative z-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <Image src="/logo.png" alt="PAYZAP Logo" width={44} height={44} className="h-11 w-11 rounded-xl shadow-lg border border-arc-border object-cover" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-arc-cyan">PAYZAP</div>
                      <div className="text-sm font-medium text-arc-textMuted">Your Web3 Wallet on Arc</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-arc-border bg-arc-panel px-4 py-1.5 w-fit backdrop-blur-md">
                    <Zap className="w-4 h-4 text-arc-cyan fill-cyan-400" />
                    <span className="text-xs font-semibold tracking-wider uppercase opacity-90 text-white">Arc Testnet</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-arc-border bg-arc-panel px-4 py-2 text-xs font-medium text-arc-text backdrop-blur-md">
                    {address || 'Connecting...'}
                  </div>
                  <ThemeToggle />
                  <button 
                    onClick={handleDisconnect}
                    className="rounded-full border border-arc-border bg-arc-panel p-2 text-arc-text backdrop-blur-md hover:bg-arc-panel hover:text-arc-text transition-colors"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mb-2 text-arc-textMuted text-sm font-medium tracking-wide">Wallet Balance</div>
              <div className="text-6xl font-extrabold tracking-tight flex items-baseline gap-2">
                {loading ? (
                    <div className="flex items-center gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
                        <span className="opacity-50">$--.--</span>
                    </div>
                ) : (
                    <>
                        <span className="text-4xl text-arc-cyan/60">$</span>
                        {balance}
                    </>
                )}
              </div>
              
              {/* Bento Box Top Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-arc-textMuted">Volume</div>
                  <div className="mt-2 text-lg font-semibold text-arc-text">${totalFlow.toFixed(2)}</div>
                </div>
                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-arc-textMuted">Swaps</div>
                  <div className="mt-2 text-lg font-semibold text-arc-text">{swapCount}</div>
                </div>
                <div className="glass-panel rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-arc-textMuted">Transfers</div>
                  <div className="mt-2 text-lg font-semibold text-arc-text">{sendCount}</div>
                </div>
              </div>
              
              {/* Tokens Held Row */}
              <button
                onClick={() => setShowTokensModal(true)}
                className="mt-4 w-full glass-panel rounded-2xl p-4 text-left hover:border-arc-cyan/40 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-arc-textMuted">Tokens Held</div>
                    <div className="mt-1 text-lg font-semibold text-arc-text">
                      {loading ? '--' : heldTokenCount} {heldTokenCount === 1 ? 'token' : 'tokens'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {heldTokenPreview.map((token) => {
                        const meta = TOKENS_BY_SYMBOL[token.symbol];
                        return (
                          <div key={token.symbol} className="rounded-full border-2 border-black bg-arc-bg p-0.5">
                            <TokenIcon symbol={token.symbol} logo={meta?.logo} size={22} />
                          </div>
                        );
                      })}
                    </div>
                    <ChevronRight className="h-4 w-4 text-arc-textMuted group-hover:text-arc-cyan transition-colors" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {heldTokenPreview.length > 0 ? heldTokenPreview.map((token) => (
                    <div key={token.symbol} className="rounded-full border border-arc-border bg-arc-panelStrong px-3 py-1.5 text-xs font-medium text-arc-text">
                      {token.symbol} {token.amount}
                    </div>
                  )) : (
                    <div className="text-xs text-arc-textMuted">No tracked token balances detected yet.</div>
                  )}
                </div>
              </button>

              {/* Tokens Modal */}
              {showTokensModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTokensModal(false)} />
                  <div className="relative w-full max-w-sm arc-panel rounded-[2rem] p-6 z-10 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-arc-textMuted">Your Wallet</div>
                        <h3 className="text-xl font-extrabold text-arc-text tracking-tight">Tokens Held</h3>
                      </div>
                      <button
                        onClick={() => setShowTokensModal(false)}
                        className="p-2 rounded-full text-arc-textMuted hover:text-arc-text hover:bg-arc-border/30 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {heldTokens.length > 0 ? heldTokens.map((token) => {
                        const meta = TOKENS_BY_SYMBOL[token.symbol];
                        return (
                          <div key={token.symbol} className="flex items-center justify-between glass-panel rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <TokenIcon symbol={token.symbol} logo={meta?.logo} size={32} />
                              <div>
                                <div className="text-sm font-bold text-arc-text">{token.symbol}</div>
                                <div className="text-xs text-arc-textMuted">{meta?.name || token.symbol}</div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-arc-text">{token.amount}</div>
                          </div>
                        );
                      }) : (
                        <div className="text-center text-arc-textMuted text-sm py-8">No tokens detected in your wallet.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Bento Box Middle: Actions */}
        <div className="px-8 pt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="glass-panel rounded-3xl p-5 group transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 hover:border-arc-cyan/50 hover:shadow-[0_10px_30px_rgba(6,182,212,0.3)] flex flex-col items-start"
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${action.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-base font-bold text-arc-text mb-1">{action.title}</div>
                  <p className="text-[11px] leading-snug text-arc-textMuted">{action.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bento Box Lower: Analytics & Activity */}
        <div className="px-8 py-8 flex-1">
          
          {historyLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
               <div className="glass-panel rounded-3xl p-5 h-48 animate-pulse bg-arc-panelStrong/50"></div>
               <div className="glass-panel rounded-3xl p-5 h-48 animate-pulse bg-arc-panelStrong/50"></div>
             </div>
          ) : (
             <Suspense fallback={<div className="h-48 animate-pulse bg-arc-panelStrong/50 rounded-3xl"></div>}>
               <AnalyticsCharts flowSegments={flowSegments} sparkline={sparkline} />
             </Suspense>
          )}

          {historyLoading ? (
              <div className="space-y-4">
                 <div className="h-6 w-40 bg-arc-panelStrong animate-pulse rounded"></div>
                 <div className="glass-panel rounded-3xl p-5 space-y-4">
                    <div className="h-16 w-full bg-arc-panelStrong animate-pulse rounded-2xl"></div>
                    <div className="h-16 w-full bg-arc-panelStrong animate-pulse rounded-2xl"></div>
                    <div className="h-16 w-full bg-arc-panelStrong animate-pulse rounded-2xl"></div>
                 </div>
              </div>
          ) : (
             <Suspense fallback={<div className="h-64 animate-pulse bg-arc-panelStrong/50 rounded-3xl"></div>}>
               <RecentActivityFeed recentTxs={recentTxs} />
             </Suspense>
          )}
</div>
        </div>
      </div>
  );
}
