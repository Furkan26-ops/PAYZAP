"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDown, CheckCircle2, Settings, ChevronDown, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { createWalletClient, custom, createPublicClient, http, formatUnits } from 'viem';
import { supabase } from '@/lib/supabase';
import { withCircleApiProxy } from '@/lib/circleProxyFetch';
import TokenIcon from '@/components/TokenIcon';
import { ThemeToggle } from '@/components/ThemeToggle';

// Constants & SDK Imports
import { ARC_TESTNET_SWAP_TOKENS, TOKENS, Token } from '@/constants/tokens';

const ARC_TESTNET_CHAIN = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } }
};

const ARC_NATIVE_USDC_GAS_RESERVE = 0.05;
const SWAP_SLIPPAGE_BPS = 300;
const BALANCE_CONFIRMATION_ATTEMPTS = 6;
const BALANCE_CONFIRMATION_DELAY_MS = 1200;
const ERC20_BALANCE_ABI = [{
  constant: true,
  inputs: [{ name: '_owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: 'balance', type: 'uint256' }],
  type: 'function',
}] as const;

function extractSwapAmountOut(result: any): string {
  return String(
    result?.estimatedOutput?.amount ??
    result?.amountOut ??
    result?.outputAmount ??
    result?.tokenOutAmount ??
    ''
  );
}

async function readArcTokenBalance(
  publicClient: ReturnType<typeof createPublicClient>,
  token: Token,
  address: string
) {
  if (token.address && token.address !== '0x0000000000000000000000000000000000000000') {
    const raw = await publicClient.readContract({
      address: token.address,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }) as bigint;

    return Number(formatUnits(raw, token.decimals));
  }

  const raw = await publicClient.getBalance({ address: address as `0x${string}` });
  return Number(formatUnits(raw, 18));
}

export default function SwapToken() {
  const [tokenIn, setTokenIn] = useState<Token>(ARC_TESTNET_SWAP_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(ARC_TESTNET_SWAP_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, string>>({
    USDC: '0.00', EURC: '0.00', ARC: '0.00', WBTC: '0.00', WETH: '0.00'
  });

  // Token Selection State
  const [selectingTarget, setSelectingTarget] = useState<'in' | 'out' | null>(null);

  const router = useRouter();

  // Load Real On-Chain Balances
  useEffect(() => {
    const address = localStorage.getItem('walletAddress');
    if (!address) return;

    const fetchBalances = async () => {
      const publicClient = createPublicClient({ chain: ARC_TESTNET_CHAIN, transport: http() });

      const newBalances: Record<string, string> = {
        USDC: '0.00',
        EURC: '0.00',
        USYC: '0.00',
        USDT: '0.00',
        XYLO: '0.00'
      };

      for (const token of ARC_TESTNET_SWAP_TOKENS) {
        try {
          const balance = await readArcTokenBalance(publicClient, token, address);
          newBalances[token.symbol] = balance.toFixed(4);
        } catch (e) {
          console.error(`Failed to fetch balance for ${token.symbol}`, e);
        }
      }
      setBalances(newBalances);
    };

    fetchBalances();
  }, []);

  // Arc App Kit Native Quoting Logic
  useEffect(() => {
    let cancelled = false;

    const fetchQuote = async () => {
      if (!amountIn) {
        setAmountOut('');
        setQuoteError('');
        return;
      }

      if (tokenIn.symbol === tokenOut.symbol) {
        setAmountOut('');
        setQuoteError('Choose two different tokens.');
        return;
      }

      const parsedAmount = Number(amountIn);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setAmountOut('');
        setQuoteError('Enter a valid swap amount.');
        return;
      }

      const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
      if (!kitKey) {
        setAmountOut('');
        setQuoteError('Circle App Kit key is missing. Add NEXT_PUBLIC_KIT_KEY before swapping.');
        return;
      }

      setQuoteLoading(true);
      setQuoteError('');
      try {
        const { AppKit } = await import('@circle-fin/app-kit');
        const kit = new AppKit();

        const params: any = {
          tokenIn: tokenIn.symbol,
          amountIn: amountIn,
          tokenOut: tokenOut.symbol,
          config: {
            kitKey,
            allowanceStrategy: 'permit',
            slippageBps: SWAP_SLIPPAGE_BPS
          }
        };

        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');
          const adapter = await createViemAdapterFromProvider({ provider: (window as any).ethereum });
          params.from = { adapter, chain: "Arc_Testnet" };
        } else {
          params.from = { chain: "Arc_Testnet" };
        }

        const estimate: any = await withCircleApiProxy(() => kit.estimateSwap(params));
        const quotedAmountOut = extractSwapAmountOut(estimate);
        if (!quotedAmountOut || Number(quotedAmountOut) <= 0) {
          throw new Error('No executable quote returned. Try a smaller amount.');
        }
        if (cancelled) return;
        setAmountOut(quotedAmountOut);
      } catch (e) {
        console.error("Quote error", e);
        if (cancelled) return;
        setAmountOut('');
        setQuoteError((e as any)?.shortMessage || (e as any)?.message || 'No quote available for this amount.');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    const quoteTimer = window.setTimeout(fetchQuote, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(quoteTimer);
    };
  }, [amountIn, tokenIn, tokenOut]);

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn(amountOut);
  };

  const handleMax = () => {
    const currentBalance = parseFloat(balances[tokenIn.symbol] || '0');
    const spendable = tokenIn.symbol === 'USDC'
      ? Math.max(0, currentBalance - ARC_NATIVE_USDC_GAS_RESERVE)
      : currentBalance;
    setAmountIn(spendable.toFixed(4));
  };

  const selectToken = (token: Token) => {
    if (selectingTarget === 'in') {
      if (token.symbol === tokenOut.symbol) handleSwapTokens();
      else setTokenIn(token);
    } else if (selectingTarget === 'out') {
      if (token.symbol === tokenIn.symbol) handleSwapTokens();
      else setTokenOut(token);
    }
    setSelectingTarget(null);
  };

  const handleSwap = async () => {
    setProcessing(true);
    setErrorMsg('');
    try {
      const address = localStorage.getItem('walletAddress');
      if (!address) throw new Error("Authentication error. Please connect wallet.");
      if (parseFloat(amountIn) <= 0) throw new Error("Amount must be greater than zero.");
      if (!amountOut || parseFloat(amountOut) <= 0 || quoteError) {
        throw new Error(quoteError || "No executable quote is available. Try a smaller amount.");
      }
      const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
      if (!kitKey) throw new Error("Circle App Kit key is missing. Add NEXT_PUBLIC_KIT_KEY before swapping.");

      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No Web3 wallet detected. Please install MetaMask.");

      const walletClient = createWalletClient({
        chain: ARC_TESTNET_CHAIN,
        transport: custom(ethereum)
      });

      try {
        await walletClient.switchChain({ id: 5042002 });
      } catch (switchError: any) {
        if (switchError.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
          try {
            await walletClient.addChain({ chain: ARC_TESTNET_CHAIN });
            await walletClient.switchChain({ id: 5042002 });
          } catch (addError: any) {
            throw new Error("Failed to add Arc Testnet to your wallet.");
          }
        } else {
          throw new Error("Please switch to the Arc Testnet in your wallet.");
        }
      }

      // Initialize Arc App Kit
      const { AppKit } = await import('@circle-fin/app-kit');
      const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');

      const adapter = await createViemAdapterFromProvider({
        provider: ethereum
      });

      const kit = new AppKit();
      const publicClient = createPublicClient({
        chain: ARC_TESTNET_CHAIN,
        transport: http()
      });

      const latestTokenInBalance = await readArcTokenBalance(publicClient, tokenIn, address);
      setBalances((current) => ({
        ...current,
        [tokenIn.symbol]: latestTokenInBalance.toFixed(4),
      }));

      if (parseFloat(amountIn) > latestTokenInBalance) {
        throw new Error(`Insufficient ${tokenIn.symbol} balance on Arc Testnet. Available: ${latestTokenInBalance.toFixed(4)} ${tokenIn.symbol}.`);
      }
      if (tokenIn.symbol === 'USDC' && parseFloat(amountIn) > Math.max(0, latestTokenInBalance - ARC_NATIVE_USDC_GAS_RESERVE)) {
        throw new Error(`Keep at least ${ARC_NATIVE_USDC_GAS_RESERVE} USDC for Arc network fees. Available to swap: ${Math.max(0, latestTokenInBalance - ARC_NATIVE_USDC_GAS_RESERVE).toFixed(4)} USDC.`);
      }

      const waitForTokenOutIncrease = async (startingBalance: number) => {
        for (let attempt = 0; attempt < BALANCE_CONFIRMATION_ATTEMPTS; attempt += 1) {
          const nextBalance = await readArcTokenBalance(publicClient, tokenOut, address);
          if (nextBalance > startingBalance) return nextBalance;
          await new Promise((resolve) => window.setTimeout(resolve, BALANCE_CONFIRMATION_DELAY_MS));
        }

        return startingBalance;
      };

      const tokenOutBalanceBefore = await readArcTokenBalance(publicClient, tokenOut, address);

      const swapResult = await withCircleApiProxy(() =>
        kit.swap({
          from: { adapter, chain: "Arc_Testnet" },
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          amountIn: amountIn,
          config: {
            kitKey,
            allowanceStrategy: 'permit',
            slippageBps: SWAP_SLIPPAGE_BPS
          }
        })
      );

      const hash = (swapResult as any).txHash as `0x${string}`;
      if (!hash) throw new Error("Swap submitted but App Kit did not return a transaction hash.");

      const minedReceipt = await publicClient.waitForTransactionReceipt({ hash });
      if (minedReceipt.status !== 'success') {
        throw new Error("Swap transaction reverted on Arc Testnet.");
      }

      const finalAmountOut = extractSwapAmountOut(swapResult) || amountOut;
      const tokenOutBalanceAfter = await waitForTokenOutIncrease(tokenOutBalanceBefore);
      if (tokenOutBalanceAfter <= tokenOutBalanceBefore) {
        throw new Error("A transaction was mined, but no output token balance increase was detected. If your wallet only showed an approval, run the swap again now that allowance is set. Otherwise try a smaller amount or check ArcScan.");
      }

      // Log to Supabase
      const { error } = await supabase.from('transactions').insert({
        wallet_address: address.toLowerCase(),
        tx_hash: hash,
        transaction_type: 'swap',
        amount_usdc: tokenIn.symbol === 'USDC' ? parseFloat(amountIn) : 0,
        token_received: tokenOut.symbol
      });

      if (error) console.error("Supabase Log Error:", error);

      // Update multi-token balances
      const updatedBalances = { ...balances };

      // Deduct Token In
      const deducted = parseFloat(updatedBalances[tokenIn.symbol]) - parseFloat(amountIn);
      updatedBalances[tokenIn.symbol] = deducted > 0 ? deducted.toFixed(4) : '0.00';

      // Add Token Out
      const detectedAmountOut = tokenOutBalanceAfter - tokenOutBalanceBefore;
      const added = parseFloat(updatedBalances[tokenOut.symbol] || '0') + detectedAmountOut;
      updatedBalances[tokenOut.symbol] = added.toFixed(4);

      setBalances(updatedBalances);
      localStorage.setItem('demoBalances', JSON.stringify(updatedBalances));

      // Keep legacy sync
      if (tokenIn.symbol === 'USDC') localStorage.setItem('demoBalance', updatedBalances.USDC);
      if (tokenOut.symbol === 'USDC') localStorage.setItem('demoBalance', updatedBalances.USDC);

      setReceipt({ amountIn, tokenIn, amountOut: detectedAmountOut.toFixed(4) || finalAmountOut, tokenOut, fee: '$0.00', hash });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.shortMessage || err.message || "An unexpected error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  if (receipt) {
    return (
      <div className="min-h-screen bg-arc-bg pb-20 sm:pb-0 flex items-center justify-center selection:bg-cyan-500/30 font-sans text-arc-text">
        <div className="max-w-md w-full bg-arc-panel backdrop-blur-2xl sm:rounded-[2.5rem] sm:shadow-2xl shadow-cyan-500/10 p-10 text-center border border-arc-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/10 to-transparent -z-10"></div>
          <div className="w-20 h-20 bg-cyan-500/20 text-arc-cyan rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-cyan-400/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-arc-text mb-2 tracking-tight">Swap Confirmed</h2>
          <p className="text-arc-textMuted mb-8 font-medium">Your transaction has been mined on Arc Testnet.</p>

          <div className="bg-arc-panelStrong border border-arc-border p-5 rounded-3xl text-left space-y-4 mb-10 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-arc-textMuted text-sm font-medium">Sold</span>
              <span className="font-bold text-arc-text text-lg">{receipt.amountIn} <span className="text-sm font-medium text-arc-textMuted">{receipt.tokenIn.symbol}</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-arc-textMuted text-sm font-medium">Bought</span>
              <span className="font-bold text-arc-cyan text-lg">{receipt.amountOut} <span className="text-sm font-medium text-cyan-500/50">{receipt.tokenOut.symbol}</span></span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="w-full py-4 px-6 bg-cyan-500 text-black rounded-2xl font-bold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const priceImpact = amountIn && amountOut ? (Math.max(0, (parseFloat(amountIn) - parseFloat(amountOut || '0')) / Math.max(parseFloat(amountIn), 1)) * 100).toFixed(2) : '0.00';

  return (
    <div className="arc-app-shell min-h-screen pb-20 sm:pb-0 font-sans selection:bg-cyan-500/30 text-arc-text">
      <div className="max-w-md mx-auto sm:my-10 overflow-hidden sm:rounded-[2.5rem] flex flex-col min-h-screen sm:min-h-0 relative bg-arc-panel backdrop-blur-3xl border border-arc-border shadow-2xl">

        {/* Token Selection Modal */}
        {selectingTarget && (
          <div className="absolute inset-0 z-50 bg-arc-bg/90 backdrop-blur-2xl flex flex-col sm:rounded-[2.5rem]">
            <div className="px-6 py-6 flex items-center justify-between border-b border-arc-border text-arc-text">
              <h3 className="text-xl font-bold text-arc-text">Select Token</h3>
              <button onClick={() => setSelectingTarget(null)} className="p-2 bg-arc-panelStrong border border-arc-border rounded-full text-arc-text hover:bg-arc-panel transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {ARC_TESTNET_SWAP_TOKENS.map(t => (
                <button
                  key={t.symbol}
                  onClick={() => selectToken(t)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-arc-panel hover:bg-arc-panelStrong border border-arc-border hover:border-cyan-500/30 transition-all text-left group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-arc-bg border border-arc-border text-xl shadow-sm">
                    <TokenIcon symbol={t.symbol} logo={t.logo} size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-arc-text text-lg group-hover:text-arc-cyan transition-colors">{t.symbol}</div>
                    <div className="text-sm text-arc-textMuted font-medium">{t.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-arc-text">{balances[t.symbol] || '0.00'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="arc-header-gradient px-8 py-6 flex items-center justify-between sticky top-0 z-10 border-b border-arc-border">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-3 -ml-3 rounded-full hover:bg-arc-panel text-arc-text hover:text-arc-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-arc-cyan">ARC PAY</div>
              <h2 className="text-xl font-bold tracking-tight text-arc-text">Swap</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="p-2 -mr-2 text-arc-textMuted hover:text-arc-cyan hover:bg-arc-panelStrong rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 bg-transparent">
          {errorMsg && (
            <div className="mb-6 bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-sm font-medium border border-rose-500/20 shadow-sm backdrop-blur-md">
              {errorMsg}
            </div>
          )}
          {quoteError && !errorMsg && (
            <div className="mb-6 bg-amber-500/10 text-amber-300 p-4 rounded-2xl text-sm font-medium border border-amber-500/20 shadow-sm backdrop-blur-md">
              {quoteError}
            </div>
          )}

          <div className="mb-6 arc-dark-card rounded-3xl px-4 py-4 text-sm text-arc-text">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-arc-cyan">Network</div>
                <div className="mt-1 font-medium text-arc-textMuted">Arc Testnet swap supports USDC and EURC. Keep USDC available for network fees.</div>
              </div>
              <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-arc-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                Testnet
              </div>
            </div>
          </div>

          <div className="space-y-2 relative">

            <div className="rounded-3xl p-5 border border-arc-border hover:border-cyan-400/30 transition-colors focus-within:border-cyan-400/50 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-arc-panelStrong shadow-inner">
              <div className="text-sm text-arc-textMuted font-semibold mb-3 tracking-wide">YOU PAY</div>
              <div className="flex justify-between items-center gap-4">
                <input
                  type="number"
                  placeholder="0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="w-full bg-transparent text-4xl text-arc-text outline-none placeholder:text-gray-600 font-extrabold tracking-tight"
                />
                <button
                  onClick={() => setSelectingTarget('in')}
                  className="flex items-center gap-2 bg-arc-panelStrong border border-arc-border px-3 py-2 rounded-2xl font-bold hover:bg-arc-panel transition-all flex-shrink-0 text-arc-text"
                >
                  <div className="bg-arc-bg rounded-full border border-arc-border p-0.5"><TokenIcon symbol={tokenIn.symbol} logo={tokenIn.logo} size={20} /></div>
                  {tokenIn.symbol}
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-arc-textMuted font-medium">
                  ${amountIn ? (parseFloat(amountIn) * 1.0).toFixed(2) : '0.00'}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <span className="text-arc-textMuted">Balance: <span className="text-arc-text">{balances[tokenIn.symbol] || '0.00'}</span></span>
                  <button onClick={handleMax} className="text-arc-cyan hover:text-cyan-300 font-bold uppercase text-[10px] tracking-wider bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-md transition-colors">Max</button>
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
              <button
                onClick={handleSwapTokens}
                className="p-3 bg-arc-bg border-4 border-[#0f1418] rounded-2xl hover:bg-arc-panel hover:border-cyan-500/30 text-arc-cyan transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)] group"
              >
                <ArrowDown className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
              </button>
            </div>

            <div className="rounded-3xl p-5 border border-arc-border hover:border-cyan-400/30 transition-colors bg-arc-panelStrong shadow-inner">
              <div className="text-sm text-arc-textMuted font-semibold mb-3 tracking-wide">YOU RECEIVE</div>
              <div className="flex justify-between items-center gap-4">
                <input
                  type="number"
                  placeholder="0"
                  value={amountOut}
                  readOnly
                  className="w-full bg-transparent text-4xl text-arc-cyan outline-none placeholder:text-gray-600 font-extrabold tracking-tight"
                />
                <button
                  onClick={() => setSelectingTarget('out')}
                  className="flex items-center gap-2 bg-arc-panelStrong border border-arc-border px-3 py-2 rounded-2xl font-bold hover:bg-arc-panel transition-all flex-shrink-0 text-arc-text"
                >
                  <div className="bg-arc-bg rounded-full border border-arc-border p-0.5"><TokenIcon symbol={tokenOut.symbol} logo={tokenOut.logo} size={20} /></div>
                  {tokenOut.symbol}
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-arc-textMuted font-medium">
                  {quoteLoading ? 'Finding best route...' : `$${amountOut ? (parseFloat(amountOut) * 1.0).toFixed(2) : '0.00'}`}
                </div>
                <div className="text-sm text-arc-textMuted font-medium">
                  Balance: <span className="text-arc-text">{balances[tokenOut.symbol] || '0.00'}</span>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-6 glass-panel rounded-3xl p-5 text-sm border-t-2 border-t-cyan-500/20">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-arc-text">Execution Summary</div>
                <div className="text-xs uppercase tracking-[0.16em] text-arc-textMuted">Pre-trade context</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-arc-textMuted">Slippage tolerance</span>
                <span className="font-semibold text-arc-text">{(SWAP_SLIPPAGE_BPS / 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-arc-textMuted">Network fee estimate</span>
                <span className="font-semibold text-arc-text">$0.03</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-arc-textMuted">Price impact</span>
                <span className={`font-semibold ${parseFloat(priceImpact) > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>{priceImpact}%</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleSwap}
              disabled={processing || quoteLoading || !amountIn || !amountOut || Boolean(quoteError)}
              className="w-full py-4 bg-cyan-500 text-black font-bold text-lg rounded-2xl hover:bg-cyan-400 disabled:bg-arc-panelStrong disabled:text-arc-textMuted disabled:border disabled:border-arc-border transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:shadow-none transform disabled:transform-none hover:-translate-y-0.5"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="animate-spin h-5 w-5" />
                  Routing Swap...
                </div>
              ) : quoteLoading ? (
                'Fetching quote...'
              ) : !amountIn ? (
                'Enter an amount'
              ) : quoteError || !amountOut ? (
                'No executable quote'
              ) : (
                'Review Swap'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
