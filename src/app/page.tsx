"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleWalletLogin = async () => {
    const ethereum = (window as any).ethereum;
    
    if (typeof ethereum === 'undefined') {
      alert('Please install a Web3 wallet (e.g. MetaMask) to continue!');
      return;
    }
    
    setLoading(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      localStorage.setItem('walletAddress', accounts[0]);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arc-hero-bg min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="arc-grid absolute inset-0 opacity-20"></div>
      <div className="absolute left-[8%] top-[14%] h-28 w-28 rounded-full border border-arc-border bg-arc-panel blur-2xl"></div>
      <div className="absolute right-[10%] bottom-[14%] h-36 w-36 rounded-full border border-arc-cyan/20 bg-arc-cyan/10 blur-3xl"></div>

      <div className="arc-panel w-full max-w-md rounded-[2rem] px-8 py-10 text-center relative z-10 text-arc-text">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="arc-brand-mark h-16 w-16 rounded-2xl animate-float"></div>
          <div className="text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-arc-cyan">ARC PAY</div>
            <div className="text-sm font-medium text-arc-textMuted">Treasury Operations Console</div>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-arc-text">Enterprise Treasury Vault</h1>
          <p className="mt-3 text-base leading-7 text-arc-textMuted">
            Secure, transparent, and compliant digital asset management for your organization.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 text-left">
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-arc-cyan">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Security</span>
            </div>
            <p className="text-sm text-arc-textMuted">Protected wallet access and controlled treasury actions.</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-arc-blue">Network</div>
            <p className="text-sm text-arc-textMuted">Built for institutional stablecoin workflows on Arc.</p>
          </div>
        </div>

        <button 
          onClick={handleWalletLogin}
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-arc-cyan to-arc-blue hover:opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-arc-cyan disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-1"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Authenticating...
            </div>
          ) : (
            <>
              Connect Web3 Wallet
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>
        
        <p className="mt-8 text-sm text-arc-cyan font-bold tracking-[0.22em] uppercase drop-shadow-md">
          Powered by Arc Network
        </p>
      </div>
    </div>
  );
}
