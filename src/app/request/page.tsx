"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Link from 'next/link';

export default function RequestMoney() {
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedAddr = localStorage.getItem('walletAddress');
    if (!storedAddr) {
      router.push('/');
    } else {
      setAddress(storedAddr);
    }
  }, [router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return null; // Wait for load

  // EIP-681 standard for requesting native tokens on EVM networks
  const qrData = `ethereum:${address}`;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto sm:my-10 overflow-hidden sm:rounded-[2.5rem] bg-white sm:shadow-2xl sm:shadow-indigo-500/10 border border-slate-100 flex flex-col min-h-screen sm:min-h-0 relative">
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center gap-4 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
          <Link href="/dashboard" className="p-3 -ml-3 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Request Money</h2>
        </div>

        <div className="p-8 flex-1 flex flex-col items-center justify-center">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Show this code</h3>
            <p className="text-slate-500 text-center text-sm font-medium mb-10">
              Ask the sender to scan this QR code with their ARC PAY app to send you funds.
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-slate-100 mb-10 relative group hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-indigo-50/50 rounded-[2rem] scale-105 -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                <QRCodeCanvas 
                    value={qrData}
                    size={220}
                    level="H"
                    includeMargin={false}
                    fgColor="#312e81" // Tailwind indigo-900
                />
            </div>

            {/* Address Display & Copy */}
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-500 mb-3 text-center tracking-wider uppercase">Your Arc Address</label>
              <button 
                onClick={handleCopy}
                className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all shadow-sm group hover:border-slate-300"
              >
                <span className="font-mono text-sm font-medium text-slate-600 truncate max-w-[220px]">
                  {address}
                </span>
                {copied ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <span className="text-xs font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity uppercase">Copy</span>
                    <Copy className="w-5 h-5" />
                  </div>
                )}
              </button>
            </div>
            
            <p className="text-center text-xs font-medium text-slate-400 mt-8 bg-slate-100 px-4 py-2 rounded-full">
              Only accept native USDC on the Arc Testnet.
            </p>
        </div>
      </div>
    </div>
  );
}
