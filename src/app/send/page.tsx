"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ArrowLeft, QrCode, X, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { createWalletClient, custom, parseEther } from 'viem';
import { supabase } from '@/lib/supabase';

export default function SendMoney() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMsg('');
    try {
      const address = localStorage.getItem('walletAddress');
      
      if (!address) throw new Error("Authentication error. Please connect wallet again.");
      if (parseFloat(amount) <= 0) throw new Error("Amount must be greater than zero.");
      
      const currentBalance = parseFloat(localStorage.getItem('demoBalance') || '100.00');
      if (parseFloat(amount) > currentBalance) {
          throw new Error("Insufficient funds available in your account.");
      }

      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No Web3 wallet detected. Please install MetaMask.");

      const arcChain = {
          id: 5042002,
          name: 'Arc Testnet',
          nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://rpc.testnet.arc.network'] },
            public: { http: ['https://rpc.testnet.arc.network'] },
          }
      };

      const walletClient = createWalletClient({
        chain: arcChain,
        transport: custom(ethereum)
      });

      // Force network switch if they are on the wrong network
      try {
        await walletClient.switchChain({ id: 5042002 });
      } catch (switchError: any) {
        // Error code 4902 indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902 || switchError.message.includes('Unrecognized chain')) {
          try {
            await walletClient.addChain({ chain: arcChain });
          } catch (addError) {
            throw new Error("Failed to add Arc Testnet to your wallet.");
          }
        } else {
          throw new Error("Please switch to the Arc Testnet in your wallet to send funds.");
        }
      }

      const hash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: recipient as `0x${string}`,
        value: parseEther(amount)
      });

      // Log to Supabase
      const { error } = await supabase.from('transactions').insert({
        wallet_address: address.toLowerCase(),
        tx_hash: hash,
        transaction_type: 'expense',
        amount_usdc: parseFloat(amount),
        category: category
      });
      if (error) {
        console.error("Supabase Log Error:", error);
      }

      const newBalance = currentBalance - parseFloat(amount) - 0.0001;
      localStorage.setItem('demoBalance', newBalance.toFixed(2));
      
      setReceipt({
          recipient,
          amount,
          fee: '$0.0001',
          hash,
          category
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.shortMessage || err.message || "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (receipt) {
      return (
          <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 flex items-center justify-center selection:bg-indigo-500/30 font-sans">
             <div className="max-w-md w-full bg-white sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-indigo-500/10 p-10 text-center border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-white -z-10"></div>
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Expense Tracked</h2>
                <p className="text-slate-500 mb-8 font-medium">Your transfer was successfully logged.</p>
                
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl text-left space-y-4 mb-10 shadow-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">Amount</span>
                        <span className="font-bold text-slate-900 text-lg">${receipt.amount} <span className="text-sm font-medium text-slate-400">USDC</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">Category</span>
                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{receipt.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">Recipient</span>
                        <span className="font-mono text-slate-900 text-xs bg-white px-2 py-1 rounded-md border border-slate-200 max-w-[150px] truncate shadow-sm">{receipt.recipient}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">Network Fee</span>
                        <span className="font-semibold text-slate-900">{receipt.fee}</span>
                    </div>
                </div>
                <button onClick={() => router.push('/dashboard')} className="w-full py-4 px-6 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-300 transform hover:-translate-y-0.5">
                    Return to Dashboard
                </button>
             </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto sm:my-10 overflow-hidden sm:rounded-[2.5rem] bg-white sm:shadow-2xl sm:shadow-indigo-500/10 border border-slate-100 flex flex-col min-h-screen sm:min-h-0 relative">
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center gap-4 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
          <Link href="/dashboard" className="p-3 -ml-3 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense Tracker</h2>
        </div>

        <div className="p-8 flex-1">
            {errorMsg && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-medium mb-8 border border-rose-100 shadow-sm">
                    {errorMsg}
                </div>
            )}
            
            <form onSubmit={handleSend} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 tracking-wide">RECIPIENT ADDRESS</label>
                    <div className="relative group">
                        <input 
                            type="text" 
                            required
                            placeholder="0x..."
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-0 pr-14 font-mono text-sm transition-all shadow-sm outline-none"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            <QrCode className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 tracking-wide">AMOUNT (USDC)</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold text-xl">$</span>
                        </div>
                        <input 
                            type="number" 
                            required
                            min="0.000001"
                            step="0.000001"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 pl-12 pr-6 py-4 text-slate-900 text-2xl font-extrabold tracking-tight placeholder-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-0 transition-all shadow-sm outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 tracking-wide">CATEGORY</label>
                    <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white focus:ring-0 transition-all shadow-sm outline-none appearance-none"
                    >
                        <option>Food</option>
                        <option>Utilities</option>
                        <option>Entertainment</option>
                        <option>Other</option>
                    </select>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={processing || !amount || !recipient}
                        className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        {processing ? (
                            <div className="flex items-center gap-3">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Requesting Signature...
                            </div>
                        ) : 'Log Expense'}
                    </button>
                    <p className="text-center text-xs font-medium text-slate-400 mt-6">Transactions on Arc Network settle in under 1 second.</p>
                </div>
            </form>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md">
                <div className="p-6 flex justify-end">
                    <button onClick={() => setShowScanner(false)} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center relative p-8">
                    <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10">
                        <Scanner 
                            onScan={(result) => {
                                if (result && result.length > 0) {
                                    const value = result[0].rawValue;
                                    const parsed = value.replace('ethereum:', '').split('@')[0];
                                    setRecipient(parsed);
                                    setShowScanner(false);
                                }
                            }}
                        />
                        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none"></div>
                        <div className="absolute inset-1/4 border-2 border-indigo-500 rounded-2xl pointer-events-none animate-pulse"></div>
                    </div>
                </div>
                <div className="p-10 text-center text-white/80">
                    <p className="font-semibold text-lg">Point camera at a wallet QR code</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
