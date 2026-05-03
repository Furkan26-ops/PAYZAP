"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2 } from 'lucide-react';
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
        id: 5042002,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: {
          default: { http: ['https://rpc.testnet.arc.network'] },
          public:  { http: ['https://rpc.testnet.arc.network'] },
        },
      };

      const walletClient = createWalletClient({ chain: arcChain, transport: custom(ethereum) });

      try {
        await walletClient.switchChain({ id: 5042002 });
      } catch (switchError: any) {
        if (switchError.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
          try {
            await walletClient.addChain({ chain: arcChain });
            await walletClient.switchChain({ id: 5042002 });
          } catch { throw new Error('Failed to add Arc Testnet to your wallet.'); }
        } else { throw new Error('Please switch to the Arc Testnet in your wallet.'); }
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const fromAddress = accounts[0] as `0x${string}`;
      const toAddress   = recipient.trim() as `0x${string}`;
      const weiAmount   = parseEther(amount);

      const hash = await walletClient.sendTransaction({ account: fromAddress, to: toAddress, value: weiAmount });

      const newBalance = (currentBalance - parseFloat(amount)).toFixed(2);
      localStorage.setItem('demoBalance', newBalance);

      const { error } = await supabase.from('transactions').insert({
        wallet_address:   fromAddress.toLowerCase(),
        tx_hash:          hash,
        transaction_type: 'send',
        amount_usdc:      parseFloat(amount),
        recipient_address: toAddress.toLowerCase(),
        category,
      });
      if (error) console.error('Supabase Log Error:', error);

      setReceipt({ recipient: toAddress, amount, fee: '$0.00', hash, category });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.shortMessage || err.message || 'An unexpected error occurred.');
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
            <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F172A] mb-1">Transaction Sent!</h2>
            <p className="text-sm text-[#64748B] mb-6">Your transaction has been submitted to Arc Testnet.</p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm text-left space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-[#64748B]">Amount</span><span className="font-bold text-[#0F172A]">{receipt.amount} USDC</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Recipient</span><span className="font-mono text-xs text-[#0F172A] max-w-[160px] truncate">{receipt.recipient}</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Fee</span><span className="font-semibold text-[#0F172A]">{receipt.fee}</span></div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="pz-btn-primary w-full justify-center">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-1">Send</h1>
          <p className="text-sm text-[#64748B] mb-8">Secure Form</p>

          <div className="pz-card">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Recipient Address</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Arc network address"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    className="pz-input pr-12 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#2563EB] transition-colors"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1.5">Arc network address</p>
              </div>

              {/* Asset */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Asset</label>
                <div className="flex items-center gap-3 pz-input">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">$</span>
                  </div>
                  <span className="text-sm font-semibold">USDC</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Amount</label>
                <input
                  type="number"
                  required
                  min="0.000001"
                  step="0.000001"
                  placeholder="Amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pz-input text-lg font-bold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="pz-input"
                >
                  <option>Food</option>
                  <option>Utilities</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Fee breakdown */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between text-[#64748B]">
                  <span>Fee breakdown</span>
                  <span>{amount ? `$${(parseFloat(amount) || 0).toFixed(2)}` : '$0.00'}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Fee</span><span>$0.00</span>
                </div>
                <hr className="border-[#E2E8F0]" />
                <div className="flex justify-between font-bold text-[#0F172A]">
                  <span>Total</span>
                  <span>{amount ? `$${(parseFloat(amount) || 0).toFixed(2)}` : '$0.00'}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing || !amount || !recipient}
                className="pz-btn-primary w-full justify-center text-base py-3"
              >
                {processing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                ) : 'Send'}
              </button>
            </form>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
            <div className="p-6 flex justify-end">
              <button onClick={() => setShowScanner(false)} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      const value  = result[0].rawValue;
                      const parsed = value.replace('ethereum:', '').split('@')[0];
                      setRecipient(parsed);
                      setShowScanner(false);
                    }
                  }}
                />
              </div>
            </div>
            <div className="p-10 text-center text-white/80">
              <p className="font-semibold text-lg">Point camera at a wallet QR code</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
