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
      <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="pz-shell flex-1 flex items-center justify-center">
          <div className="pz-card w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--blue-mid)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--blue)' }} />
            </div>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text)' }}>Swap Confirmed!</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Mined on Arc Testnet.</p>
            <div className="p-4 rounded-xl text-sm text-left space-y-3 mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Sold</span><span className="font-bold">{receipt.amountIn} {receipt.tokenIn.symbol}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Bought</span><span className="font-bold" style={{ color: 'var(--blue)' }}>{receipt.amountOut} {receipt.tokenOut.symbol}</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="pz-btn pz-btn-primary pz-btn-lg w-full">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const priceImpact = amountIn && amountOut ? (Math.max(0, (parseFloat(amountIn) - parseFloat(amountOut || '0')) / Math.max(parseFloat(amountIn), 1)) * 100).toFixed(2) : '0.00';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <div className="pz-page-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 className="pz-page-title">Token Exchange</h1>
              <p className="pz-page-subtitle">Swap tokens on Arc Testnet</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--violet-soft)' }}>
              <ArrowDown className="w-5 h-5" style={{ color: 'var(--violet)' }} />
            </div>
          </div>

          {/* Token Selection Modal */}
          {selectingTarget && (
            <div className="pz-modal-overlay">
              <div className="pz-modal-backdrop" onClick={() => setSelectingTarget(null)} />
              <div className="pz-modal animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>Select Token</h3>
                  <button onClick={() => setSelectingTarget(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors" style={{ color: 'var(--muted)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {ARC_TESTNET_SWAP_TOKENS.map(t => (
                    <button key={t.symbol} onClick={() => selectToken(t)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--border-2)' }}>
                        <TokenIcon symbol={t.symbol} logo={t.logo} size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t.symbol}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{t.name}</div>
                      </div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{balances[t.symbol] || '0.00'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pz-card">
            {errorMsg && (
              <div className="p-4 rounded-xl text-sm font-medium mb-5" style={{ background: 'var(--red-soft)', border: '1px solid #FECACA', color: 'var(--red)' }}>
                {errorMsg}
              </div>
            )}
            {quoteError && !errorMsg && (
              <div className="p-4 rounded-xl text-sm font-medium mb-5" style={{ background: 'var(--amber-soft)', border: '1px solid #FDE68A', color: '#92400E' }}>
                {quoteError}
              </div>
            )}

            <div className="mb-5 flex items-center justify-between p-3 rounded-xl text-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="font-medium" style={{ color: 'var(--muted)' }}>Arc Testnet · Keep USDC for fees</span>
              <span className="pz-chip">Testnet</span>
            </div>

            <div className="relative">
              {/* Pay panel */}
              <div className="p-4 rounded-xl mb-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Pay</div>
                <div className="flex items-center gap-3">
                  <input type="number" placeholder="0" value={amountIn} onChange={e => setAmountIn(e.target.value)}
                    className="flex-1 bg-transparent text-3xl font-extrabold outline-none"
                    style={{ color: 'var(--text)', '--tw-placeholder-color': 'var(--border)' } as any} />
                  <button onClick={() => setSelectingTarget('in')}
                    className="pz-btn pz-btn-ghost pz-btn-sm flex items-center gap-2 flex-shrink-0">
                    <TokenIcon symbol={tokenIn.symbol} logo={tokenIn.logo} size={16} />
                    {tokenIn.symbol} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--muted-2)' }}>
                  <span>${amountIn ? (parseFloat(amountIn)*1).toFixed(2) : '0.00'}</span>
                  <div className="flex items-center gap-2">
                    <span>Balance: {balances[tokenIn.symbol] || '0.00'}</span>
                    <button onClick={handleMax} className="font-bold" style={{ color: 'var(--blue)' }}>Max</button>
                  </div>
                </div>
              </div>

              {/* Swap arrow */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button onClick={handleSwapTokens}
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                  style={{ border: '2px solid var(--border)', color: 'var(--blue)' }}>
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Receive panel */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Receive</div>
                <div className="flex items-center gap-3">
                  <input type="number" placeholder="0" value={amountOut} readOnly
                    className="flex-1 bg-transparent text-3xl font-extrabold outline-none"
                    style={{ color: 'var(--blue)' }} />
                  <button onClick={() => setSelectingTarget('out')}
                    className="pz-btn pz-btn-ghost pz-btn-sm flex items-center gap-2 flex-shrink-0">
                    <TokenIcon symbol={tokenOut.symbol} logo={tokenOut.logo} size={16} />
                    {tokenOut.symbol} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--muted-2)' }}>
                  <span>{quoteLoading ? 'Getting quote…' : `$${amountOut ? (parseFloat(amountOut)*1).toFixed(2) : '0.00'}`}</span>
                  <span>Balance: {balances[tokenOut.symbol] || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-5 p-4 rounded-xl text-sm space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Exchange Summary</p>
              <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>Slippage</span><span className="font-semibold" style={{ color: 'var(--text)' }}>{(SWAP_SLIPPAGE_BPS/100).toFixed(2)}%</span></div>
              <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>Network fee</span><span className="font-semibold" style={{ color: 'var(--text)' }}>$0.03</span></div>
              <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                <span>Price impact</span>
                <span className="font-semibold" style={{ color: parseFloat(priceImpact) > 1 ? 'var(--red)' : 'var(--green)' }}>{priceImpact}%</span>
              </div>
            </div>

            <button onClick={handleSwap}
              disabled={processing || quoteLoading || !amountIn || !amountOut || Boolean(quoteError)}
              className="pz-btn pz-btn-primary pz-btn-lg w-full mt-5">
              {processing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Routing Swap…</> :
               quoteLoading ? 'Fetching quote…' : !amountIn ? 'Enter an amount' :
               quoteError || !amountOut ? 'No quote available' : 'Execute Swap'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
