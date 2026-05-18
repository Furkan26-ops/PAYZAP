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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative bg-arc-bg overflow-hidden text-arc-text">
      
      {/* ── Background Orbs ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-arc-cyan rounded-full mix-blend-multiply filter blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-arc-blue rounded-full mix-blend-multiply filter blur-[150px] opacity-10 pointer-events-none" />

      {/* ── Verify Modal (Overlay) ── */}
      {step === 'verify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-fade-up border-arc-border">
            <button
              onClick={handleCancelVerify}
              className="absolute top-4 right-4 p-2 rounded-full text-arc-textMuted hover:text-arc-text hover:bg-arc-panelStrong transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-arc-cyan/10 flex items-center justify-center mb-6 border border-arc-cyan/20 mx-auto">
              <CheckCircle2 className="w-7 h-7 text-arc-cyan" />
            </div>

            <h2 className="text-2xl font-bold text-arc-text mb-2 text-center">Verify your account</h2>
            <p className="text-sm text-arc-textMuted leading-relaxed mb-6 text-center">
              To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
            </p>

            <div className="flex items-center justify-center gap-2 bg-arc-panelStrong border border-arc-border rounded-xl px-4 py-3 mb-6 mx-auto w-fit shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-sm font-mono font-bold text-arc-text">
                {connectedAddress.slice(0, 8)}…{connectedAddress.slice(-6)}
              </span>
            </div>

            {signError && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium px-4 py-3 rounded-xl">
                {signError}
              </div>
            )}

            <button
              onClick={handleSignMessage}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-arc-blue hover:bg-arc-blue/90 text-white font-bold rounded-xl shadow-lg shadow-arc-blue/20 transition-all disabled:opacity-70"
            >
              {loading ? 'Waiting for signature…' : 'Sign message'}
            </button>
          </div>
        </div>
      )}

      {/* ── Left Column: Pitch ── */}
      <div className="relative z-10 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 border-r border-arc-border/50">
        <div className="flex items-center gap-4 mb-12">
          <Image
            src="/logo.png"
            alt="Payzap"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-cover shadow-sm border border-arc-border"
          />
          <span className="text-2xl font-black tracking-tight text-arc-text">PAYZAP</span>
        </div>

        <h1 className="text-4xl lg:text-5xl font-extrabold text-arc-text leading-[1.15] tracking-tight mb-6">
          The smarter way to pay, swap, and manage your money.
        </h1>
        
        <p className="text-lg text-arc-textMuted leading-relaxed mb-12 max-w-lg font-medium">
          Skip the complicated setups. Connect your wallet instantly to send payments, swap assets, and track your daily spending all in one beautiful app.
        </p>

        <div className="space-y-8">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm border border-emerald-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-arc-text mb-1">Instant Payments</h3>
              <p className="text-arc-textMuted font-medium">Send and receive funds seamlessly across the network.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-arc-blue/10 flex items-center justify-center flex-shrink-0 text-arc-blue shadow-sm border border-arc-blue/20">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-arc-text mb-1">Built-in Swaps</h3>
              <p className="text-arc-textMuted font-medium">Exchange your assets instantly with zero friction.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-500 shadow-sm border border-purple-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-arc-text mb-1">Money Management</h3>
              <p className="text-arc-textMuted font-medium">Track your inflows, outflows, and recent activity with crystal-clear analytics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Auth Card ── */}
      <div className="relative z-10 flex flex-col justify-center items-center px-6 py-12 bg-arc-panelStrong/20">
        <div className="glass-panel rounded-3xl p-10 w-full max-w-md shadow-2xl border-arc-border">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-arc-text mb-2">Welcome Back</h2>
            <p className="text-arc-textMuted font-medium">Log in to your treasury console</p>
          </div>

          <div className="space-y-4">
            {/* MetaMask (Main) */}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-arc-panel hover:bg-arc-panelStrong border border-arc-border text-arc-text py-3.5 px-6 rounded-2xl font-bold text-[15px] shadow-sm transition-all disabled:opacity-70"
            >
              <Wallet className="w-5 h-5 text-[#F6851B]" />
              MetaMask
            </button>

            {/* WalletConnect (Secondary) */}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-arc-panel hover:bg-arc-panelStrong border border-arc-border text-arc-text py-3.5 px-6 rounded-2xl font-bold text-[15px] shadow-sm transition-all disabled:opacity-70"
            >
              <LinkIcon className="w-5 h-5 text-[#3B99FC]" />
              WalletConnect
            </button>
          </div>

          <p className="text-center text-xs font-medium text-arc-textMuted mt-8 leading-relaxed px-4">
            By connecting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
