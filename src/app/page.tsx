"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, X, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      
      {/* ── Verify Modal ── */}
      {step === 'verify' && (
        <div className="pz-modal-overlay">
          <div className="pz-modal-backdrop" onClick={handleCancelVerify} />
          <div className="pz-modal animate-fade-up">
            <button
              onClick={handleCancelVerify}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">Verify your account</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mb-5 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="text-xs font-mono font-medium text-slate-600">
                {connectedAddress.slice(0, 10)}…{connectedAddress.slice(-6)}
              </span>
            </div>

            {signError && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-lg">
                {signError}
              </div>
            )}

            <button
              onClick={handleSignMessage}
              disabled={loading}
              className="pz-btn pz-btn-primary pz-btn-lg w-full"
            >
              {loading ? 'Waiting for signature…' : 'Sign message'}
            </button>
          </div>
        </div>
      )}

      {/* ── Login Card ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-sm shadow-sm relative z-10 flex flex-col items-center text-center animate-fade-up">
        
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Image
            src="/logo.png"
            alt="Payzap"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="text-xl font-bold tracking-tight text-slate-900">Payzap</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-3">
          Decentralized<br />Treasury Console
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          The modern decentralized treasury console for the Arc Network.
        </p>

        <button
          onClick={handleConnectWallet}
          disabled={loading}
          className="pz-btn pz-btn-primary pz-btn-lg w-full"
        >
          {loading && step === 'login' ? 'Connecting…' : 'Connect Wallet'}
        </button>
        
        <p className="text-xs text-slate-400 mt-4">
          Instantly generates your Arc Testnet wallet.
        </p>
      </div>
    </div>
  );
}
