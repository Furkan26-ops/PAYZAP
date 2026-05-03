"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, Send } from 'lucide-react';
import { createWalletClient, custom, parseEther } from 'viem';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

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
        <main className="pz-shell flex-1 flex items-center justify-center">
          <div className="pz-card w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--green-mid)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--green)' }} />
            </div>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--text)' }}>Sent!</h2>
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
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <div className="pz-page-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 className="pz-page-title">Send</h1>
              <p className="pz-page-subtitle">Secure transfer on Arc Testnet</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue-soft)' }}>
              <Send className="w-5 h-5" style={{ color: 'var(--blue)' }} />
            </div>
          </div>

          <div className="pz-card">
            {errorMsg && (
              <div className="p-4 rounded-xl text-sm font-medium mb-5" style={{ background: 'var(--red-soft)', border: '1px solid #FECACA', color: 'var(--red)' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Recipient Address</label>
                <div className="relative">
                  <input
                    type="text" required placeholder="Arc network address (0x…)"
                    value={recipient} onChange={e => setRecipient(e.target.value)}
                    className="pz-input pr-12 font-mono text-xs"
                  />
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--muted)' }}>
                    <QrCode className="w-5 h-5 hover:text-[#2563EB]" />
                  </button>
                </div>
              </div>

              {/* Asset (static) */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Asset</label>
                <div className="flex items-center gap-3 pz-input">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--blue-mid)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--blue)' }}>$</span>
                  </div>
                  <span className="text-sm font-semibold">USDC</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Amount</label>
                <input
                  type="number" required min="0.000001" step="0.000001" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="pz-input text-xl font-bold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="pz-input">
                  <option>Food</option>
                  <option>Utilities</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Fee breakdown */}
              <div className="p-4 rounded-xl text-sm space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Fee Breakdown</p>
                <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                  <span>Amount</span>
                  <span>{amount ? `$${(parseFloat(amount)||0).toFixed(2)}` : '$0.00'}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                  <span>Network fee</span><span>$0.00</span>
                </div>
                <hr style={{ borderColor: 'var(--border)' }} />
                <div className="flex justify-between font-bold" style={{ color: 'var(--text)' }}>
                  <span>Total</span>
                  <span>{amount ? `$${(parseFloat(amount)||0).toFixed(2)}` : '$0.00'}</span>
                </div>
              </div>

              <button type="submit" disabled={processing || !amount || !recipient} className="pz-btn pz-btn-primary pz-btn-lg w-full">
                {processing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send</>
                }
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
