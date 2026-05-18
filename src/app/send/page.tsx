"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, ChevronDown, ArrowUpRight, Search, RefreshCw } from 'lucide-react';
import { createWalletClient, custom, parseUnits, createPublicClient, http, formatUnits } from 'viem';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';
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
      const amountFloat = parseFloat(amount);
      if (amountFloat > currentBalance) throw new Error(`Insufficient ${selectedToken.symbol} balance.`);

      const usdcBalance = parseFloat(balances['USDC'] || '0');
      if (selectedToken.symbol !== 'USDC' && usdcBalance < 0.001) {
         throw new Error('You need Arc Testnet USDC to pay for gas fees.');
      }
      if (selectedToken.symbol === 'USDC' && amountFloat > Math.max(0, currentBalance - 0.05)) {
         throw new Error(`Keep at least 0.05 USDC for Arc network fees. Available to send: ${Math.max(0, currentBalance - 0.05).toFixed(4)} USDC.`);
      }

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
        hash = await walletClient.sendTransaction({
          chain: ARC_TESTNET_CHAIN,
          account: fromAddress,
          to: toAddress,
          value: amountParsed,
        });
      } else {
        hash = await walletClient.writeContract({
          chain: ARC_TESTNET_CHAIN,
          account: fromAddress,
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress, amountParsed],
        });
      }

      const publicClient = createPublicClient({ chain: ARC_TESTNET_CHAIN, transport: http() });
      const txReceipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (txReceipt.status !== 'success') {
        throw new Error('Transaction failed or reverted on the blockchain.');
      }

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
      <div className="flex min-h-screen bg-arc-bg text-arc-text">
        <Sidebar />
        <main className="pz-shell flex-1 flex items-start justify-center pt-24">
          <div className="glass-panel w-full max-w-sm text-center rounded-3xl p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-1 text-arc-text">Sent!</h2>
            <p className="text-sm mb-6 text-arc-textMuted">Your transaction has been submitted to Arc Testnet.</p>
            <div className="p-4 rounded-xl text-sm text-left space-y-3 mb-6 bg-arc-panelStrong border border-arc-border">
              <div className="flex justify-between"><span className="text-arc-textMuted">Amount</span><span className="font-bold text-arc-text">{receipt.amount} {receipt.token}</span></div>
              <div className="flex justify-between"><span className="text-arc-textMuted">Recipient</span><span className="font-mono text-xs max-w-[160px] truncate text-arc-text">{receipt.recipient}</span></div>
              <div className="flex justify-between"><span className="text-arc-textMuted">Fee</span><span className="font-semibold text-arc-text">$0.00</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="pz-btn pz-btn-primary pz-btn-lg w-full !rounded-2xl">
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
      <main className="pz-shell flex-1 flex flex-col items-center sm:items-start pt-16 relative">
        <div className="absolute top-8 right-8 hidden sm:block">
          <UserProfile />
        </div>
        <div className="w-full max-w-sm">
          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-arc-cyan/10 text-arc-cyan border border-arc-cyan/20">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-arc-text">Send Funds</h1>
            </div>
            
            {errorMsg && (
              <div className="p-4 rounded-2xl text-sm font-medium mb-5 bg-red-500/10 border border-red-500/20 text-red-500">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-arc-textMuted">Recipient Address</label>
                <div className="relative">
                  <input
                    type="text" required placeholder="0x..."
                    value={recipient} onChange={e => setRecipient(e.target.value)}
                    className="w-full bg-arc-panelStrong/50 border border-arc-border rounded-xl py-3 px-4 text-sm text-arc-text outline-none focus:border-arc-cyan/50"
                  />
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-arc-textMuted">
                    <QrCode className="w-5 h-5 hover:text-arc-cyan" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-arc-textMuted">Select Asset</label>
                <button type="button" onClick={() => setShowTokenModal(true)}
                  className="w-full flex items-center justify-between bg-arc-panelStrong/50 border border-arc-border rounded-xl py-3 px-4 text-sm text-arc-text hover:border-arc-cyan/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol={selectedToken.symbol} logo={selectedToken.logo} size={20} />
                    <span className="font-medium">{selectedToken.symbol}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-arc-textMuted" />
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-arc-textMuted">Amount</label>
                  <span className="text-[10px] font-bold text-arc-textMuted">Balance: {parseFloat(balances[selectedToken.symbol] || '0').toFixed(4)}</span>
                </div>
                <div className="relative">
                  <input
                    type="number" step="any" required placeholder="0.00"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-arc-panelStrong/50 border border-arc-border rounded-xl py-3 px-4 text-sm text-arc-text outline-none focus:border-arc-cyan/50"
                  />
                  <button type="button" onClick={() => setAmount(balances[selectedToken.symbol] || '0')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-arc-cyan hover:underline">
                    MAX
                  </button>
                </div>
              </div>

              <button type="submit" disabled={processing || !amount || !recipient}
                className="pz-btn pz-btn-primary pz-btn-lg w-full !rounded-2xl shadow-lg shadow-arc-blue/20">
                {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Transfer'}
              </button>
            </form>
          </div>
        </div>

        {showTokenModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel rounded-[32px] w-full max-w-sm max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl border-arc-border">
              <div className="p-4 border-b border-arc-border flex items-center justify-between">
                <h3 className="font-bold text-arc-text">Select Token</h3>
                <button onClick={() => setShowTokenModal(false)} className="p-1 hover:bg-arc-panelStrong rounded-lg transition-colors">
                  <X className="w-5 h-5 text-arc-textMuted" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arc-textMuted" />
                  <input 
                    type="text" placeholder="Search tokens..."
                    value={searchToken} onChange={e => setSearchToken(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-arc-panelStrong border-transparent rounded-xl text-sm text-arc-text focus:ring-0"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredTokens.map(token => (
                  <button 
                    key={token.symbol} 
                    onClick={() => { setSelectedToken(token); setShowTokenModal(false); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-arc-panelStrong/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} logo={token.logo} size={32} />
                      <div className="text-left">
                        <div className="font-bold text-sm text-arc-text group-hover:text-arc-cyan transition-colors">{token.symbol}</div>
                        <div className="text-[10px] text-arc-textMuted">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right text-arc-text font-medium text-sm">
                      {parseFloat(balances[token.symbol] || '0').toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-md">
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
