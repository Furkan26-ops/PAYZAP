"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShieldCheck, Wallet, X, PenLine } from 'lucide-react';
import Image from 'next/image';

type Step = 'login' | 'verify';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [signError, setSignError] = useState('');
  const router = useRouter();

  // Step 1: Connect wallet, then show the verify modal
  const handleConnectWallet = async () => {
    const ethereum = (window as any).ethereum;

    if (typeof ethereum === 'undefined') {
      alert('Please install a Web3 wallet (e.g. MetaMask) to continue!');
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

  // Step 2: Ask the wallet to sign a verification message
  const handleSignMessage = async () => {
    const ethereum = (window as any).ethereum;
    setSignError('');
    setLoading(true);

    try {
      const message = `Welcome to PAYZAP!\n\nSign this message to verify you own this wallet.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${connectedAddress}\nTimestamp: ${new Date().toISOString()}`;

      await ethereum.request({
        method: 'personal_sign',
        params: [message, connectedAddress],
      });

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
    <div className="arc-hero-bg min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="arc-grid absolute inset-0 opacity-20"></div>
      <div className="absolute left-[8%] top-[14%] h-28 w-28 rounded-full border border-arc-border bg-arc-panel blur-2xl"></div>
      <div className="absolute right-[10%] bottom-[14%] h-36 w-36 rounded-full border border-arc-cyan/20 bg-arc-cyan/10 blur-3xl"></div>

      {/* ── Verify Modal Overlay ── */}
      {step === 'verify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelVerify} />

          {/* Modal */}
          <div className="relative arc-panel w-full max-w-sm rounded-[2rem] px-8 py-10 text-center z-10 text-arc-text shadow-2xl border border-arc-border">
            <button
              onClick={handleCancelVerify}
              className="absolute top-5 right-5 p-2 rounded-full text-arc-textMuted hover:text-arc-text hover:bg-arc-border/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <PenLine className="h-8 w-8 text-arc-cyan" />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-arc-text mb-2">
              Verify your account
            </h2>
            <p className="text-sm leading-6 text-arc-textMuted mb-2">
              To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
            </p>

            {/* Connected wallet chip */}
            <div className="my-5 flex items-center justify-center gap-2 rounded-full border border-arc-border bg-arc-panel px-4 py-2 w-fit mx-auto">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-mono font-medium text-arc-textMuted">
                {connectedAddress.slice(0, 8)}...{connectedAddress.slice(-6)}
              </span>
            </div>

            {signError && (
              <p className="mb-4 text-sm text-rose-400 font-medium">{signError}</p>
            )}

            <button
              id="sign-message-btn"
              onClick={handleSignMessage}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-arc-cyan to-arc-blue hover:opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-arc-cyan disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Waiting for signature...
                </div>
              ) : (
                <>
                  <PenLine className="h-5 w-5" />
                  Sign message
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Login Card ── */}
      <div className="arc-panel w-full max-w-md rounded-[2rem] px-8 py-10 text-center relative z-10 text-arc-text">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="PAYZAP Logo" width={64} height={64} className="h-16 w-16 rounded-2xl animate-float shadow-xl border border-arc-border object-cover" />
          <div className="text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-arc-cyan">PAYZAP</div>
            <div className="text-sm font-medium text-arc-textMuted">Your Web3 Wallet on Arc</div>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-arc-text">Your crypto. Your control.</h1>
          <p className="mt-3 text-base leading-7 text-arc-textMuted">
            Send, receive, swap, and track your digital assets. All in one place on Arc.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 text-left">
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-arc-cyan">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Security</span>
            </div>
            <p className="text-sm text-arc-textMuted">Your keys, your assets. Non-custodial and fully secure.</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-arc-blue">Network</div>
            <p className="text-sm text-arc-textMuted">Send, swap & receive on Arc Network instantly.</p>
          </div>
        </div>

        <button
          id="connect-wallet-btn"
          onClick={handleConnectWallet}
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-arc-cyan to-arc-blue hover:opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-arc-cyan disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-1"
        >
          {loading && step === 'login' ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Connecting...
            </div>
          ) : (
            <>
              <Wallet className="h-5 w-5" />
              Connect Wallet
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>

        <p className="mt-8 text-sm text-arc-textMuted font-medium tracking-wide">
          Powered by Arc Network
        </p>
      </div>
    </div>
  );
}
