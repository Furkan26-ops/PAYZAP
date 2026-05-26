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
import UserProfile from '@/components/UserProfile';

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

const NETWORKS = [
  { id: 'Arc_Testnet', name: 'Arc Testnet', icon: '/arc-network-logo.png' },
  { id: 'Ethereum_Sepolia', name: 'Ethereum Sepolia', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
  { id: 'Solana_Devnet', name: 'Solana Devnet', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
];

const ARC_NATIVE_USDC_GAS_RESERVE = 0.05;
const SWAP_SLIPPAGE_BPS = 300;
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
  // On Arc Testnet, USDC is the native gas token.
  if (token.symbol === 'USDC') {
    const raw = await publicClient.getBalance({ address: address as `0x${string}` });
    return Number(formatUnits(raw, 18));
  }

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
  const [networkIn, setNetworkIn] = useState(NETWORKS[0]);
  const [networkOut, setNetworkOut] = useState(NETWORKS[0]);
  const [tokenIn, setTokenIn] = useState<Token>(ARC_TESTNET_SWAP_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(ARC_TESTNET_SWAP_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [processing, setProcessing] = useState(false);
  const [bridgeStep, setBridgeStep] = useState<'idle' | 'initiated' | 'approve' | 'burn' | 'attest' | 'mint'>('idle');
  const [bridgeEstimate, setBridgeEstimate] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, string>>({});

  // Selection State
  const [selectingTarget, setSelectingTarget] = useState<'in' | 'out' | null>(null);
  const [modalNetwork, setModalNetwork] = useState(NETWORKS[0]);

  const router = useRouter();

  const isBridge = networkIn.id !== networkOut.id;
  const isInvalidBridge = isBridge && (tokenIn.symbol !== 'USDC' || tokenOut.symbol !== 'USDC');

  // Load Real On-Chain Balances
  useEffect(() => {
    const fetchBalances = async () => {
      const address = localStorage.getItem('walletAddress');
      if (!address) return;
      
      // We'll focus on Arc balances for this demo
      const publicClient = createPublicClient({ chain: ARC_TESTNET_CHAIN, transport: http() });
      const newBalances: Record<string, string> = {};

      for (const token of ARC_TESTNET_SWAP_TOKENS) {
        try {
          const balance = await readArcTokenBalance(publicClient, token, address);
          newBalances[token.symbol] = balance.toFixed(4);
        } catch (e) {
          newBalances[token.symbol] = '0.00';
        }
      }
      setBalances(newBalances);
    };

    fetchBalances();
  }, []);

  // Quoting Logic
  useEffect(() => {
    let cancelled = false;

    const fetchQuote = async () => {
      if (!amountIn) {
        setAmountOut('');
        setQuoteError('');
        return;
      }

      if (isBridge) {
        if (tokenIn.symbol !== 'USDC' || tokenOut.symbol !== 'USDC') {
          setAmountOut('');
          setQuoteError('Only USDC can be bridged across networks.');
          return;
        }
        setAmountOut(amountIn);
        setQuoteError('');
        
        // Fetch Bridge Estimate
        try {
          const { AppKit } = await import('@circle-fin/app-kit');
          const kit = new AppKit();
          const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');
          const adapter = await createViemAdapterFromProvider({ provider: (window as any).ethereum });
          
          const estimate = await withCircleApiProxy(() => kit.bridge.estimateCosts({
            from: { adapter, chain: networkIn.id },
            to: { adapter, chain: networkOut.id },
            amount: amountIn
          }));
          if (!cancelled) setBridgeEstimate(estimate);
        } catch (e) {
          console.error("Bridge estimate error", e);
        }
        return;
      }
      
      setBridgeEstimate(null);

      if (!isBridge && tokenIn.symbol === tokenOut.symbol) {
        setAmountOut('');
        setQuoteError('Choose two different tokens.');
        return;
      }

      const parsedAmount = Number(amountIn);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setAmountOut('');
        return;
      }

      setQuoteLoading(true);
      setQuoteError('');
      try {
        const { AppKit } = await import('@circle-fin/app-kit');
        const kit = new AppKit();
        const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
        console.log('[QUOTE] Using Kit Key:', kitKey ? 'DEFINED' : 'UNDEFINED');

        const params: any = {
          tokenIn: tokenIn.symbol,
          amountIn: amountIn,
          tokenOut: tokenOut.symbol,
          config: { kitKey, allowanceStrategy: 'permit', slippageBps: SWAP_SLIPPAGE_BPS }
        };

        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');
          const adapter = await createViemAdapterFromProvider({ provider: (window as any).ethereum });
          params.from = { adapter, chain: "Arc_Testnet" };
        } else {
          params.from = { chain: "Arc_Testnet" };
        }

        console.log('[QUOTE] Requesting Estimate...', params);
        const estimate: any = await withCircleApiProxy(() => kit.estimateSwap(params));
        console.log('[QUOTE] Estimate Success:', estimate);
        const quotedAmountOut = extractSwapAmountOut(estimate);
        if (cancelled) return;
        setAmountOut(quotedAmountOut);
      } catch (e: any) {
        if (cancelled) return;
        console.error('[QUOTE] Error:', e);
        setAmountOut('');
        // ...
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    const quoteTimer = window.setTimeout(fetchQuote, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(quoteTimer);
    };
  }, [amountIn, tokenIn, tokenOut, isBridge]);

  const handleSwitchDirection = () => {
    const tempToken = tokenIn;
    const tempNet = networkIn;
    setTokenIn(tokenOut);
    setNetworkIn(networkOut);
    setTokenOut(tempToken);
    setNetworkOut(tempNet);
    setAmountIn(amountOut);
  };

  const handleMax = () => {
    const currentBalance = parseFloat(balances[tokenIn.symbol] || '0');
    let spendable = currentBalance;
    if (tokenIn.symbol === 'USDC' && networkIn.id === 'Arc_Testnet') {
      spendable = Math.max(0, currentBalance - ARC_NATIVE_USDC_GAS_RESERVE);
    }
    setAmountIn(spendable.toString());
  };

  const selectTokenAndNetwork = (token: Token, network: any) => {
    if (selectingTarget === 'in') {
      if (token.symbol === tokenOut.symbol && network.id === networkOut.id) {
        handleSwitchDirection();
      } else {
        setTokenIn(token);
        setNetworkIn(network);
      }
    } else {
      if (token.symbol === tokenIn.symbol && network.id === networkIn.id) {
        handleSwitchDirection();
      } else {
        setTokenOut(token);
        setNetworkOut(network);
      }
    }
    setSelectingTarget(null);
  };

  const handleExecute = async () => {
    if (!amountIn || !tokenIn || !tokenOut) return;
    setErrorMsg('');
    setProcessing(true);
    setBridgeStep('initiated');

    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or similar.');
      }

      const { AppKit } = await import('@circle-fin/app-kit');
      const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');
      const adapter = await createViemAdapterFromProvider({ provider: (window as any).ethereum });
      const kit = new AppKit();
      const kitKey = process.env.NEXT_PUBLIC_KIT_KEY;
      console.log('[SWAP] Using Kit Key:', kitKey ? 'DEFINED' : 'UNDEFINED');

      // Event Listeners for UX progress
      kit.on('approve', () => {
        console.log('[SWAP] Event: Approve');
        setBridgeStep('approve');
      });
      kit.on('burn', () => {
        console.log('[SWAP] Event: Burn');
        setBridgeStep('burn');
      });
      kit.on('fetchAttestation', () => {
        console.log('[SWAP] Event: Attest');
        setBridgeStep('attest');
      });
      kit.on('mint', () => {
        console.log('[SWAP] Event: Mint');
        setBridgeStep('mint');
      });

      if (isBridge) {
        // ...
      } else {
        console.log('[SWAP] Executing Swap...');
        const swapResult = await withCircleApiProxy(() =>
          kit.swap({
            from: { adapter, chain: "Arc_Testnet" },
            tokenIn: tokenIn.symbol,
            tokenOut: tokenOut.symbol,
            amountIn: amountIn,
            config: { kitKey, allowanceStrategy: 'permit', slippageBps: SWAP_SLIPPAGE_BPS }
          })
        );
        console.log('[SWAP] Success:', swapResult);
        setReceipt({ amountIn, tokenIn, amountOut: extractSwapAmountOut(swapResult) || amountOut, tokenOut, hash: (swapResult as any).txHash });
      }
    } catch (err: any) {
      console.error('[SWAP] Error:', err);
      const msg = String(err?.message || err || '');
      setErrorMsg(msg || 'Execution failed.');
    } finally {
      setProcessing(false);
      setBridgeStep('idle');
    }
  };

  if (receipt) {
    return (
      <div className="flex min-h-screen bg-arc-bg text-arc-text">
        <Sidebar />
        <main className="pz-shell flex-1">
          <div className="flex justify-end mb-8 hidden sm:flex">
            <UserProfile />
          </div>
          <div className="glass-panel rounded-[32px] p-8 max-w-[480px] w-full text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-arc-cyan/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-arc-cyan" />
            </div>
            <h2 className="text-2xl font-bold text-arc-text mb-2">
              {receipt.isBridge ? 'Bridge Initiated' : 'Swap Confirmed'}
            </h2>
            <p className="text-sm text-arc-textMuted mb-8 leading-relaxed">
              {receipt.isBridge 
                ? `Moving funds to ${receipt.toNet}. Bridging typically takes 3-5 minutes to finalize.` 
                : 'Your transaction was successfully submitted to the network.'}
            </p>
            <div className="bg-arc-panelStrong rounded-2xl p-4 text-left space-y-3 mb-8 border border-arc-border">
              <div className="flex justify-between text-sm"><span className="text-arc-textMuted">Sent</span><span className="font-semibold text-arc-text">{receipt.amountIn} {receipt.tokenIn.symbol}</span></div>
              <div className="flex justify-between text-sm"><span className="text-arc-textMuted">Received</span><span className="font-semibold text-arc-cyan">{receipt.amountOut} {receipt.tokenOut.symbol}</span></div>
              {receipt.isBridge && (
                 <div className="flex justify-between text-[10px] pt-2 border-t border-arc-border">
                    <span className="text-arc-textMuted">Transaction</span>
                    <a href={`https://testnet.arcscan.app/tx/${receipt.hash}`} target="_blank" rel="noreferrer" className="text-arc-cyan hover:underline truncate max-w-[120px]">
                      {receipt.hash}
                    </a>
                 </div>
              )}
            </div>
            <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-arc-blue hover:bg-arc-blue/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-arc-blue/20 active:scale-95">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-arc-bg text-arc-text">
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="flex justify-end mb-8 hidden sm:flex">
          <UserProfile />
        </div>
        
        {/* Uniswap-style Exchange Card */}
        <div className="w-full max-w-[480px] glass-panel rounded-[32px] p-2 relative shadow-2xl shadow-black/20">
          
          <div className="p-3">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-base font-bold text-arc-text">Swap</h2>
              <Settings className="w-5 h-5 text-arc-textMuted cursor-pointer hover:text-arc-text transition-colors" />
            </div>

            {errorMsg && (
              <div className="mx-2 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <span className="text-red-500 text-xs font-medium flex-1">{errorMsg}</span>
                <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-1 relative">
              {/* Pay Panel */}
              <div className="bg-arc-panelStrong/50 rounded-[24px] p-4 transition-all hover:bg-arc-panelStrong group border border-transparent focus-within:border-arc-border">
                <div className="text-xs font-bold text-arc-textMuted mb-3 uppercase tracking-wider">You Pay</div>
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="number"
                    placeholder="0"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    className="bg-transparent text-4xl font-semibold outline-none w-full text-arc-text placeholder:text-arc-textMuted/30"
                  />
                  <button
                    onClick={() => { setSelectingTarget('in'); setModalNetwork(networkIn); }}
                    className="flex items-center gap-2 bg-arc-panel px-3 py-2 rounded-2xl shadow-sm border border-arc-border hover:border-arc-cyan/50 transition-all flex-shrink-0"
                  >
                    <div className="relative">
                      <TokenIcon symbol={tokenIn.symbol} logo={tokenIn.logo} size={24} />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-arc-panel border border-arc-border flex items-center justify-center text-[8px] shadow-sm overflow-hidden">
                        <img src={networkIn.icon} alt={networkIn.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-arc-text">{tokenIn.symbol}</span>
                    <ChevronDown className="w-4 h-4 text-arc-textMuted" />
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-400">${amountIn ? (parseFloat(amountIn) * 1).toFixed(2) : '0.00'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Balance: {balances[tokenIn.symbol] || '0.00'}</span>
                    <button onClick={handleMax} className="text-blue-600 font-bold hover:underline">MAX</button>
                  </div>
                </div>
              </div>

              {/* Direction Switcher */}
              <div className="absolute left-1/2 -translate-x-1/2 top-[calc(50%-20px)] z-20">
                <button
                  onClick={handleSwitchDirection}
                  className="w-10 h-10 bg-white rounded-xl border-4 border-[#F8FAFC] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-blue-600"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              </div>

              {/* Receive Panel */}
              <div className="bg-[#F5F6FC] rounded-[24px] p-4 transition-all hover:bg-[#F0F2FA] border border-transparent">
                <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">You Receive</div>
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="number"
                    placeholder="0"
                    value={amountOut}
                    readOnly
                    className="bg-transparent text-4xl font-semibold outline-none w-full text-slate-900 placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => { setSelectingTarget('out'); setModalNetwork(networkOut); }}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all flex-shrink-0"
                  >
                    <div className="relative">
                      <TokenIcon symbol={tokenOut.symbol} logo={tokenOut.logo} size={24} />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white border border-slate-50 flex items-center justify-center text-[8px] shadow-sm overflow-hidden">
                        <img src={networkOut.icon} alt={networkOut.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-800">{tokenOut.symbol}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-400">
                    {quoteLoading ? 'Fetching best price...' : `$${amountOut ? (parseFloat(amountOut) * 1).toFixed(2) : '0.00'}`}
                  </span>
                  <span className="text-slate-400">Balance: {balances[tokenOut.symbol] || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Exchange Summary */}
            <div className="mt-6 p-4 rounded-[24px] bg-arc-panelStrong/50 border border-arc-border space-y-3 transition-all animate-fade-in">
              <div className="flex justify-between items-center text-xs font-bold text-arc-textMuted uppercase tracking-widest mb-1">
                <span>Summary</span>
                <Settings className="w-3.5 h-3.5" />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-arc-textMuted">{isBridge ? 'Estimated Time' : 'Max Slippage'}</span>
                <span className="text-sm font-bold text-arc-text">
                  {isBridge ? '10-15 mins' : `${(SWAP_SLIPPAGE_BPS / 100).toFixed(2)}%`}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-arc-textMuted">{isBridge ? 'Bridge Fee' : 'Network Fee'}</span>
                <span className="text-sm font-bold text-arc-text">
                  {isBridge 
                    ? (bridgeEstimate ? `${parseFloat(bridgeEstimate.total).toFixed(4)} ${tokenIn.symbol}` : 'Estimating...') 
                    : '$0.03'}
                </span>
              </div>

              {!isBridge && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-arc-textMuted">Price Impact</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {amountIn && amountOut ? (Math.max(0, (parseFloat(amountIn) - parseFloat(amountOut)) / parseFloat(amountIn)) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
              )}
            </div>

            {/* Main Action Button */}
            <button
              onClick={handleExecute}
              disabled={processing || quoteLoading || !amountIn || isInvalidBridge}
              className={`w-full mt-4 py-4 rounded-[20px] font-bold text-lg transition-all shadow-lg ${
                isInvalidBridge 
                  ? 'bg-red-500/10 text-red-400 cursor-not-allowed shadow-none' 
                  : 'bg-arc-blue hover:bg-arc-blue/90 text-white shadow-arc-blue/20 active:scale-[0.98]'
              }`}
            >
              {processing ? (
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>
                    {bridgeStep === 'approve' ? 'Approving...' :
                     bridgeStep === 'burn' ? 'Burning...' :
                     bridgeStep === 'attest' ? 'Attesting...' :
                     bridgeStep === 'mint' ? 'Minting...' : 'Processing...'}
                  </span>
                </div>
              ) : 
               isInvalidBridge ? 'Unsupported Bridge' : 
               !amountIn ? 'Enter Amount' : 
               isBridge ? 'Bridge' : 'Swap'}
            </button>
            
            {isInvalidBridge && (
              <p className="text-center text-[10px] font-bold text-red-400 mt-3 uppercase tracking-widest">
                Cross-chain bridging is restricted to USDC
              </p>
            )}
          </div>
        </div>

        {/* Unified Selection Modal */}
        {selectingTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-fade-up border-arc-border">
              <div className="p-6 border-b border-arc-border">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-arc-text">Select Token</h3>
                  <button onClick={() => setSelectingTarget(null)} className="p-2 hover:bg-arc-panelStrong rounded-full transition-colors">
                    <X className="w-5 h-5 text-arc-textMuted" />
                  </button>
                </div>
                
                {/* Embedded Network Selector */}
                <div className="flex gap-2 bg-arc-panelStrong/50 p-1.5 rounded-[20px] mb-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setModalNetwork(n)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-all ${
                        modalNetwork.id === n.id 
                          ? 'bg-arc-panel text-arc-cyan shadow-sm border border-arc-border' 
                          : 'text-arc-textMuted hover:text-arc-text'
                      }`}
                    >
                      <img src={n.icon} alt={n.name} className="w-4 h-4 object-cover rounded-full" />
                      {n.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 max-h-[400px] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {(modalNetwork.id === 'Arc_Testnet' ? ARC_TESTNET_SWAP_TOKENS : TOKENS.filter(t => t.symbol === 'USDC')).map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => selectTokenAndNetwork(t, modalNetwork)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-arc-panelStrong/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <TokenIcon symbol={t.symbol} logo={t.logo} size={36} />
                        <div className="text-left">
                          <div className="font-bold text-arc-text group-hover:text-arc-cyan transition-colors">{t.symbol}</div>
                          <div className="text-xs text-arc-textMuted">{t.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-arc-text">{balances[t.symbol] || '0.00'}</div>
                        <div className="text-[10px] font-bold text-arc-textMuted uppercase tracking-tighter">Balance</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
