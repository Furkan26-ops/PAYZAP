"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, ChevronDown, ArrowUpRight, Search } from 'lucide-react';
import { createWalletClient, custom, parseUnits, createPublicClient, http, formatUnits } from 'viem';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import TokenIcon from '@/components/TokenIcon';
import { TOKENS, Token } from '@/constants/tokens';

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

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function SendMoney() {
  const [recipient,   setRecipient  ] = useState('');
  const [amount,      setAmount     ] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [processing,  setProcessing ] = useState(false);
  const [errorMsg,    setErrorMsg   ] = useState('');
  const [receipt,     setReceipt    ] = useState<any>(null);
  const [searchToken, setSearchToken] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    const address = localStorage.getItem('walletAddress');
    if (!address) return;

    const fetchBalances = async () => {
      const publicClient = createPublicClient({ chain: ARC_TESTNET_CHAIN, transport: http() });
      const newBalances: Record<string, string> = {};
      
      for (const token of TOKENS) {
        try {
          if (token.symbol === 'USDC') {
            const raw = await publicClient.getBalance({ address: address as `0x${string}` });
            newBalances[token.symbol] = formatUnits(raw, 18);
          } else {
            const raw = await publicClient.readContract({
              address: token.address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            }) as bigint;
            newBalances[token.symbol] = formatUnits(raw, token.decimals);
          }
        } catch (e) {
          console.error(`Failed to fetch balance for ${token.symbol}`, e);
        }
      }
      setBalances(newBalances);
    };

    fetchBalances();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMsg('');
    try {
      const address = localStorage.getItem('walletAddress');
      if (!address) throw new Error('Authentication error. Please connect wallet again.');
      
      const currentBalance = parseFloat(balances[selectedToken.symbol] || '0');
      if (parseFloat(amount) > currentBalance) throw new Error(`Insufficient ${selectedToken.symbol} balance.`);

      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('No Web3 wallet detected. Please install MetaMask.');

      const walletClient = createWalletClient({ chain: ARC_TESTNET_CHAIN, transport: custom(ethereum) });
      
      // Ensure on correct chain
      try { 
        await walletClient.switchChain({ id: 5042002 }); 
      } catch (se: any) {
        if (se.code === 4902 || se?.message?.includes('Unrecognized chain')) {
          await walletClient.addChain({ chain: ARC_TESTNET_CHAIN });
          await walletClient.switchChain({ id: 5042002 });
        } else throw new Error('Please switch to the Arc Testnet in your wallet.');
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const fromAddress = accounts[0] as `0x${string}`;
      const toAddress = recipient.trim() as `0x${string}`;
      const amountParsed = parseUnits(amount, selectedToken.decimals);

      let hash: `0x${string}`;

      if (selectedToken.symbol === 'USDC') {
        // Native token transfer
        hash = await walletClient.sendTransaction({
          account: fromAddress,
          to: toAddress,
          value: amountParsed,
        });
      } else {
        // ERC-20 token transfer
        const { request } = await createPublicClient({ 
          chain: ARC_TESTNET_CHAIN, 
          transport: http() 
        }).simulateContract({
          account: fromAddress,
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress, amountParsed],
        });
        hash = await walletClient.writeContract(request);
      }

      // Record transaction
      await supabase.from('transactions').insert({
        wallet_address: fromAddress.toLowerCase(),
        tx_hash: hash,
        transaction_type: 'send',
        token_symbol: selectedToken.symbol,
        amount_display: `${amount} ${selectedToken.symbol}`,
        recipient_address: toAddress.toLowerCase(),
      });

      setReceipt({ recipient: toAddress, amount, token: selectedToken.symbol, hash });
    } catch (err: any) {
      setErrorMsg(err.shortMessage || err.message || 'An unexpected error occurred.');
    } finally { setProcessing(false); }
  };

  const filteredTokens = TOKENS.filter(t => 
    t.symbol.toLowerCase().includes(searchToken.toLowerCase()) || 
    t.name.toLowerCase().includes(searchToken.toLowerCase())
  );

  if (receipt) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="pz-shell flex-1 flex items-start justify-center pt-24">
          <div className="pz-card w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#ECFDF5' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--success)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Sent!</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Your transaction has been submitted to Arc Testnet.</p>
            <div className="p-4 rounded-xl text-sm text-left space-y-3 mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Amount</span><span className="font-bold">{receipt.amount} {receipt.token}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Recipient</span><span className="font-mono text-xs max-w-[160px] truncate">{receipt.recipient}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Fee</span><span className="font-semibold">$0.00</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="pz-btn pz-btn-primary pz-btn-lg w-full">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start justify-center pt-16">
        <div className="w-full max-w-sm">
          <div className="pz-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 border border-blue-200">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Send Funds</h1>
            </div>
            
            {errorMsg && (
              <div className="p-4 rounded-2xl text-sm font-medium mb-5" style={{ background: 'var(--red-soft)', border: '1px solid #FECACA', color: 'var(--danger)' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Recipient Address</label>
                <div className="relative">
                  <input
                    type="text" required placeholder="0x..."
                    value={recipient} onChange={e => setRecipient(e.target.value)}
                    className="pz-input text-sm pr-12 h-12"
                  />
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--muted)' }}>
                    <QrCode className="w-5 h-5 hover:text-[#2563EB]" />
                  </button>
                </div>
              </div>

              {/* Asset Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Select Asset</label>
                <button type="button" onClick={() => setShowTokenModal(true)}
                  className="w-full flex items-center justify-between pz-input h-12 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={selectedToken.symbol} logo={selectedToken.logo} size={24} />
                    <div>
                      <div className="text-sm font-bold">{selectedToken.symbol}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Balance: {parseFloat(balances[selectedToken.symbol] || '0').toFixed(4)}</div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Amount</label>
                  <button type="button" onClick={() => setAmount(balances[selectedToken.symbol] || '0')}
                    className="text-[10px] font-bold text-blue-600 hover:underline">MAX</button>
                </div>
                <div className="relative">
                  <input
                    type="number" required min="0.000001" step="0.000001" placeholder="0.00"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="pz-input text-lg font-bold h-14 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">{selectedToken.symbol}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-2xl text-xs space-y-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Estimated Fee</span><span className="font-bold text-slate-700">$0.00</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Network</span><span className="font-bold text-slate-700">Arc Testnet</span></div>
              </div>

              <button type="submit" disabled={processing || !amount || !recipient} 
                className="pz-btn pz-btn-primary pz-btn-lg w-full h-14 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all font-bold text-base">
                {processing ? 'Processing Transaction…' : `Send ${selectedToken.symbol}`}
              </button>
            </form>
          </div>
        </div>

        {/* Token Selection Modal */}
        {showTokenModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="pz-card w-full max-w-sm max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold">Select Token</h3>
                <button onClick={() => setShowTokenModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" placeholder="Search tokens..."
                    value={searchToken} onChange={e => setSearchToken(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-sm focus:ring-0"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredTokens.map(token => (
                  <button 
                    key={token.symbol} 
                    onClick={() => { setSelectedToken(token); setShowTokenModal(false); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} logo={token.logo} size={32} />
                      <div className="text-left">
                        <div className="font-bold text-sm group-hover:text-blue-600 transition-colors">{token.symbol}</div>
                        <div className="text-[10px] text-slate-500">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{parseFloat(balances[token.symbol] || '0').toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md">
            <div className="p-6 flex justify-end">
              <button onClick={() => setShowScanner(false)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 relative">
                <div className="absolute inset-0 z-10 border-[40px] border-black/40 pointer-events-none"></div>
                <Scanner onScan={r => {
                  if (r?.[0]) { setRecipient(r[0].rawValue.replace('ethereum:','').split('@')[0]); setShowScanner(false); }
                }} />
              </div>
            </div>
            <p className="text-center text-white/70 font-bold pb-20 tracking-wide">SCAN RECIPIENT QR CODE</p>
          </div>
        )}
      </main>
    </div>
  );
}

