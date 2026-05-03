"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, X, PenLine, ShieldCheck, Zap, ChevronRight } from 'lucide-react';
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
    <div className="pz-login-bg">
      {/* Ambient glows */}
      <div className="pz-login-glow-1" />
      <div className="pz-login-glow-2" />

      {/* ── Verify Modal ── */}
      {step === 'verify' && (
        <div className="pz-modal-overlay">
          <div className="pz-modal-backdrop" onClick={handleCancelVerify} />
          <div className="pz-modal animate-fade-up">
            {/* Close */}
            <button
              onClick={handleCancelVerify}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-5 border border-[#DBEAFE]">
              <PenLine className="w-7 h-7 text-[#2563EB]" />
            </div>

            <h2 className="text-xl font-bold text-[#0F172A] mb-1.5">Verify your account</h2>
            <p className="text-sm text-[#64748B] leading-relaxed mb-5">
              To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
            </p>

            {/* Address chip */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-4 py-2 w-fit mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-xs font-mono font-semibold text-[#334155]">
                {connectedAddress.slice(0, 10)}…{connectedAddress.slice(-6)}
              </span>
            </div>

            {signError && (
              <div className="mb-4 bg-[#FEF2F2] border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-lg">
                {signError}
              </div>
            )}

            <button
              id="sign-message-btn"
              onClick={handleSignMessage}
              disabled={loading}
              className="pz-btn pz-btn-primary pz-btn-lg w-full"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Waiting for signature…</>
              ) : (
                <><PenLine className="w-4 h-4" /> Sign message</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Login Card ── */}
      <div className="pz-login-card animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="PAYZAP"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#2563EB]">PAYZAP</div>
            <div className="text-sm text-[#94A3B8] font-medium">Your Web3 Wallet on Arc</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Your crypto.<br />Your control.
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Send, receive, swap, and track your digital assets. All in one place on Arc.
          </p>
        </div>

        {/* Feature chips */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="pz-login-feature">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-bold text-white uppercase tracking-[0.12em]">Security</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">Your keys, your assets. Non-custodial and fully secure.</p>
          </div>
          <div className="pz-login-feature">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-xs font-bold text-white uppercase tracking-[0.12em]">Network</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">Send, swap & receive on Arc Network instantly.</p>
          </div>
        </div>

        {/* CTA */}
        <button
          id="connect-wallet-btn"
          onClick={handleConnectWallet}
          disabled={loading}
          className="pz-btn pz-btn-primary pz-btn-lg w-full"
        >
          {loading && step === 'login' ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
          ) : (
            <><Wallet className="w-4 h-4" /> Connect Wallet <ChevronRight className="w-4 h-4 ml-auto opacity-60" /></>
          )}
        </button>

        <p className="text-center text-xs text-[#475569] mt-6 font-medium">
          Powered by Arc Network · Non-custodial
        </p>
      </div>
    </div>
  );
}
