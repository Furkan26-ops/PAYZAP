"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { createWalletClient, custom, parseEther } from 'viem';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import TokenIcon from '@/components/TokenIcon';

export default function SendMoney() {
  const [recipient,   setRecipient  ] = useState('');
  const [amount,      setAmount     ] = useState('');
  const [category,    setCategory   ] = useState('Food');
  const [showScanner, setShowScanner] = useState(false);
  const [processing,  setProcessing ] = useState(false);
  const [errorMsg,    setErrorMsg   ] = useState('');
  const [receipt,     setReceipt    ] = useState<any>(null);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMsg('');
    try {
      const address = localStorage.getItem('walletAddress');
      if (!address) throw new Error('Authentication error. Please connect wallet again.');
      if (parseFloat(amount) <= 0) throw new Error('Amount must be greater than zero.');
      const currentBalance = parseFloat(localStorage.getItem('demoBalance') || '100.00');
      if (parseFloat(amount) > currentBalance) throw new Error('Insufficient funds available in your account.');
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('No Web3 wallet detected. Please install MetaMask.');
      const arcChain = {
        id: 5042002, name: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] }, public: { http: ['https://rpc.testnet.arc.network'] } },
      };
      const walletClient = createWalletClient({ chain: arcChain, transport: custom(ethereum) });
      try { await walletClient.switchChain({ id: 5042002 }); }
      catch (se: any) {
        if (se.code === 4902 || se?.message?.includes('Unrecognized chain')) {
          await walletClient.addChain({ chain: arcChain });
          await walletClient.switchChain({ id: 5042002 });
        } else throw new Error('Please switch to the Arc Testnet in your wallet.');
      }
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const hash = await walletClient.sendTransaction({
        account: accounts[0] as `0x${string}`,
        to: recipient.trim() as `0x${string}`,
        value: parseEther(amount),
      });
      localStorage.setItem('demoBalance', (currentBalance - parseFloat(amount)).toFixed(2));
      await supabase.from('transactions').insert({
        wallet_address: accounts[0].toLowerCase(), tx_hash: hash,
        transaction_type: 'send', amount_usdc: parseFloat(amount),
        recipient_address: recipient.trim().toLowerCase(), category,
      });
      setReceipt({ recipient: recipient.trim(), amount, fee: '$0.00', hash, category });
    } catch (err: any) {
      setErrorMsg(err.shortMessage || err.message || 'An unexpected error occurred.');
    } finally { setProcessing(false); }
  };

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
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Amount</span><span className="font-bold">{receipt.amount} USDC</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Recipient</span><span className="font-mono text-xs max-w-[160px] truncate">{receipt.recipient}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Fee</span><span className="font-semibold">{receipt.fee}</span></div>
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
            <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Send Funds</h1>
            
            {errorMsg && (
              <div className="p-4 rounded-xl text-sm font-medium mb-5" style={{ background: 'var(--red-soft)', border: '1px solid #FECACA', color: 'var(--danger)' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Recipient Address</label>
                <div className="relative">
                  <input
                    type="text" required placeholder="Arc network address"
                    value={recipient} onChange={e => setRecipient(e.target.value)}
                    className="pz-input text-sm"
                  />
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--muted)' }}>
                    <QrCode className="w-5 h-5 hover:text-[#2563EB]" />
                  </button>
                </div>
              </div>

              {/* Asset (static) */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Asset</label>
                <div className="flex items-center justify-between pz-input" style={{ cursor: 'pointer' }}>
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol="USDC" logo="/usdc-logo.png" size={20} />
                    <span className="text-sm font-semibold">USDC</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Amount</label>
                <input
                  type="number" required min="0.000001" step="0.000001" placeholder="Amount"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="pz-input text-sm"
                />
              </div>

              {/* Fee breakdown */}
              <div className="text-xs space-y-2 mt-6 mb-6" style={{ color: 'var(--muted)' }}>
                <div className="flex justify-between">
                  <span>Fee breakdown</span>
                  <span className="font-medium text-slate-700">{amount ? `$${(parseFloat(amount)||0).toFixed(2)} USDC` : '0.00 USDC'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Fee</span>
                  <span className="font-medium text-slate-700">0.15 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversion Fee</span>
                  <span className="font-medium text-slate-700">0.05 USDC</span>
                </div>
                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between font-bold" style={{ color: 'var(--text)' }}>
                  <span>Total</span>
                  <span>{amount ? `${(parseFloat(amount) + 0.20).toFixed(2)} USDC` : '0.20 USDC'}</span>
                </div>
              </div>

              <button type="submit" disabled={processing || !amount || !recipient} className="pz-btn pz-btn-primary pz-btn-lg w-full">
                {processing ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </div>

        {/* QR Scanner */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur">
            <div className="p-6 flex justify-end">
              <button onClick={() => setShowScanner(false)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Scanner onScan={r => {
                  if (r?.[0]) { setRecipient(r[0].rawValue.replace('ethereum:','').split('@')[0]); setShowScanner(false); }
                }} />
              </div>
            </div>
            <p className="text-center text-white/70 font-medium pb-10">Point camera at a wallet QR code</p>
          </div>
        )}
      </main>
    </div>
  );
}
