"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, CheckCircle2, Settings, ChevronDown, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { createWalletClient, custom, createPublicClient, http, formatUnits } from 'viem';
import { supabase } from '@/lib/supabase';
import { withCircleApiProxy } from '@/lib/circleProxyFetch';
import TokenIcon from '@/components/TokenIcon';
import Sidebar from '@/components/Sidebar';

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
      <div className="flex min-h-screen bg-[#F0F2F5]">
        <Sidebar />
        <main className="pz-shell flex-1 flex items-center justify-center">
          <div className="pz-card w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-[#DBEAFE] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F172A] mb-1">Swap Confirmed!</h2>
            <p className="text-sm text-[#64748B] mb-6">Mined on Arc Testnet.</p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm text-left space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-[#64748B]">Sold</span><span className="font-bold text-[#0F172A]">{receipt.amountIn} {receipt.tokenIn.symbol}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Bought</span><span className="font-bold text-[#2563EB]">{receipt.amountOut} {receipt.tokenOut.symbol}</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="pz-btn-primary w-full justify-center">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const priceImpact = amountIn && amountOut ? (Math.max(0, (parseFloat(amountIn) - parseFloat(amountOut || '0')) / Math.max(parseFloat(amountIn), 1)) * 100).toFixed(2) : '0.00';

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-1">Token Exchange</h1>
          <p className="text-sm text-[#64748B] mb-8">Swap tokens on Arc Testnet</p>

          {/* Token Selection Modal */}
          {selectingTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectingTarget(null)} />
              <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 z-10 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#0F172A]">Select Token</h3>
                  <button onClick={() => setSelectingTarget(null)} className="p-1.5 rounded-full hover:bg-[#F1F5F9] text-[#64748B]"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {ARC_TESTNET_SWAP_TOKENS.map(t => (
                    <button key={t.symbol} onClick={() => selectToken(t)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F1F5F9] border border-transparent hover:border-[#E2E8F0] transition-all text-left">
                      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F1F5F9]">
                        <TokenIcon symbol={t.symbol} logo={t.logo} size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-[#0F172A]">{t.symbol}</div>
                        <div className="text-xs text-[#64748B]">{t.name}</div>
                      </div>
                      <div className="text-sm font-semibold text-[#0F172A]">{balances[t.symbol] || '0.00'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pz-card">
            {errorMsg && (<div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium mb-5">{errorMsg}</div>)}
            {quoteError && !errorMsg && (<div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm font-medium mb-5">{quoteError}</div>)}

            <div className="mb-5 flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm">
              <span className="text-[#64748B] font-medium">Arc Testnet · Keep USDC for fees</span>
              <span className="pz-chip">Testnet</span>
            </div>

            <div className="space-y-2 relative">
              {/* Pay panel */}
              <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-3">Pay</div>
                <div className="flex items-center gap-3">
                  <input type="number" placeholder="0" value={amountIn} onChange={e => setAmountIn(e.target.value)}
                    className="flex-1 bg-transparent text-3xl font-extrabold text-[#0F172A] outline-none placeholder:text-[#CBD5E1]" />
                  <button onClick={() => setSelectingTarget('in')}
                    className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg font-semibold text-sm hover:border-[#2563EB] transition-all flex-shrink-0">
                    <TokenIcon symbol={tokenIn.symbol} logo={tokenIn.logo} size={18} />
                    {tokenIn.symbol} <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-[#94A3B8]">
                  <span>${amountIn ? (parseFloat(amountIn) * 1.0).toFixed(2) : '0.00'}</span>
                  <div className="flex items-center gap-2">
                    <span>Balance: {balances[tokenIn.symbol] || '0.00'}</span>
                    <button onClick={handleMax} className="text-[#2563EB] font-bold">Max</button>
                  </div>
                </div>
              </div>

              {/* Swap arrow */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button onClick={handleSwapTokens}
                  className="w-9 h-9 bg-white border-2 border-[#E2E8F0] rounded-full flex items-center justify-center shadow hover:border-[#2563EB] text-[#2563EB] transition-all">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Receive panel */}
              <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-3">Receive</div>
                <div className="flex items-center gap-3">
                  <input type="number" placeholder="0" value={amountOut} readOnly
                    className="flex-1 bg-transparent text-3xl font-extrabold text-[#2563EB] outline-none placeholder:text-[#CBD5E1]" />
                  <button onClick={() => setSelectingTarget('out')}
                    className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg font-semibold text-sm hover:border-[#2563EB] transition-all flex-shrink-0">
                    <TokenIcon symbol={tokenOut.symbol} logo={tokenOut.logo} size={18} />
                    {tokenOut.symbol} <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-[#94A3B8]">
                  <span>{quoteLoading ? 'Getting quote…' : `$${amountOut ? (parseFloat(amountOut)*1.0).toFixed(2) : '0.00'}`}</span>
                  <span>Balance: {balances[tokenOut.symbol] || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">Current exchange rate</p>
              <div className="flex justify-between"><span className="text-[#64748B]">Slippage</span><span className="font-semibold">{(SWAP_SLIPPAGE_BPS/100).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Network fee</span><span className="font-semibold">$0.03</span></div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Price impact</span>
                <span className={`font-semibold ${parseFloat(priceImpact)>1?'text-red-500':'text-emerald-600'}`}>{priceImpact}%</span>
              </div>
            </div>

            <button onClick={handleSwap}
              disabled={processing || quoteLoading || !amountIn || !amountOut || Boolean(quoteError)}
              className="pz-btn-primary w-full justify-center mt-5 text-base py-3">
              {processing ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Routing Swap…</>) :
               quoteLoading ? 'Fetching quote…' : !amountIn ? 'Enter an amount' :
               quoteError || !amountOut ? 'No quote available' : 'Execute Swap'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

