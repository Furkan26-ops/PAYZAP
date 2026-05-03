"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

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

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
      // Note: Once redirected back to /dashboard, a session will be available.
      // Your backend would then provision the Circle Developer-Controlled wallet
      // and map it to this user's Supabase session.
    } catch (err: any) {
      console.error('Discord login error:', err);
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
          <Image src="/logo.png" alt="Arc Pay Logo" width={64} height={64} className="h-16 w-16 rounded-2xl animate-float shadow-xl border border-arc-border object-cover" />
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

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 py-4 px-6 rounded-2xl text-base font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_20px_rgba(88,101,242,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-1"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            Continue with Discord
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-arc-border"></div>
            <span className="flex-shrink-0 mx-4 text-arc-textMuted text-xs uppercase tracking-widest font-semibold">OR</span>
            <div className="flex-grow border-t border-arc-border"></div>
          </div>

          <button 
            onClick={handleWalletLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-base font-bold text-arc-cyan bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-arc-cyan disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-1"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-arc-cyan/30 border-t-arc-cyan rounded-full animate-spin"></div>
                Authenticating...
              </div>
            ) : (
              <>
                Connect Web3 Wallet
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
        
        <p className="mt-8 text-sm text-arc-textMuted font-medium tracking-wide">
          Powered by Arc Network
        </p>
      </div>
    </div>
  );
}
