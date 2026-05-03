"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, X, CheckCircle2, Zap, ArrowLeftRight, BarChart3, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';

type Step = 'login' | 'verify';

export default function Login() {
  const [loading,          setLoading         ] = useState(false);
  const [step,             setStep            ] = useState<Step>('login');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [signError,        setSignError       ] = useState('');
  const router = useRouter();

  const handleConnectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (typeof ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet to continue.');
      return;
    }
    setLoading(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setConnectedAddress(accounts[0]);
      setStep('verify');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    const ethereum = (window as any).ethereum;
    setSignError('');
    setLoading(true);
    try {
      const message = `Welcome to PAYZAP!\n\nSign this message to verify you own this wallet.\nThis will not trigger any transaction or cost any gas.\n\nWallet: ${connectedAddress}\nTimestamp: ${new Date().toISOString()}`;
      await ethereum.request({ method: 'personal_sign', params: [message, connectedAddress] });
      localStorage.setItem('walletAddress', connectedAddress);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setSignError(err.code === 4001 ? 'You rejected the signature request.' : 'Signing failed. Please try again.');
      setLoading(false);
    }
  };

  const handleCancelVerify = () => {
    setStep('login');
    setConnectedAddress('');
    setSignError('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative bg-white overflow-hidden">
      
      {/* ── Background Orbs ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 pointer-events-none" />

      {/* ── Verify Modal (Overlay) ── */}
      {step === 'verify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-fade-up">
            <button
              onClick={handleCancelVerify}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100 mx-auto">
              <CheckCircle2 className="w-7 h-7 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Verify your account</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 text-center">
              To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
            </p>

            <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 mx-auto w-fit shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-sm font-mono font-bold text-slate-700">
                {connectedAddress.slice(0, 8)}…{connectedAddress.slice(-6)}
              </span>
            </div>

            {signError && (
              <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                {signError}
              </div>
            )}

            <button
              onClick={handleSignMessage}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-70"
            >
              {loading ? 'Waiting for signature…' : 'Sign message'}
            </button>
          </div>
        </div>
      )}

      {/* ── Left Column: Pitch ── */}
      <div className="relative z-10 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 border-r border-slate-100/50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">PAYZAP</span>
        </div>

        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] tracking-tight mb-6">
          The smarter way to pay, swap, and manage your money.
        </h1>
        
        <p className="text-lg text-slate-600 leading-relaxed mb-12 max-w-lg font-medium">
          Skip the complicated setups. Log in instantly with Discord to send payments, swap assets, and track your daily spending all in one beautiful app.
        </p>

        <div className="space-y-8">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-sm border border-emerald-200/50">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Instant Payments</h3>
              <p className="text-slate-500 font-medium">Send and receive funds seamlessly across the network.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm border border-blue-200/50">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Built-in Swaps</h3>
              <p className="text-slate-500 font-medium">Exchange your assets instantly with zero friction.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 shadow-sm border border-purple-200/50">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Money Management</h3>
              <p className="text-slate-500 font-medium">Track your inflows, outflows, and recent activity with crystal-clear analytics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Auth Card ── */}
      <div className="relative z-10 flex flex-col justify-center items-center px-6 py-12 bg-slate-50/50">
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-10 w-full max-w-md shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Log in to your treasury console</p>
          </div>

          <div className="space-y-4">
            {/* Discord Login (Main) */}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white py-4 px-6 rounded-2xl font-bold text-[15px] shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 group"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0788.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
              {loading && step === 'login' ? 'Connecting...' : 'Continue with Discord'}
            </button>

            <div className="flex items-center gap-3 my-6 opacity-60">
              <div className="h-px bg-slate-300 flex-1"></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Or connect wallet</span>
              <div className="h-px bg-slate-300 flex-1"></div>
            </div>

            {/* MetaMask (Secondary) */}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-6 rounded-2xl font-bold text-[15px] shadow-sm transition-all disabled:opacity-70"
            >
              <Wallet className="w-5 h-5 text-[#F6851B]" />
              MetaMask
            </button>

            {/* WalletConnect (Secondary) */}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-6 rounded-2xl font-bold text-[15px] shadow-sm transition-all disabled:opacity-70"
            >
              <LinkIcon className="w-5 h-5 text-[#3B99FC]" />
              WalletConnect
            </button>
          </div>

          <p className="text-center text-xs font-medium text-slate-400 mt-8 leading-relaxed px-4">
            By connecting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
