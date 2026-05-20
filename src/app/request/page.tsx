"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Sidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';

export default function RequestMoney() {
  const [address, setAddress] = useState('');
  const [copied,  setCopied ] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const addr = localStorage.getItem('walletAddress');
    if (!addr) { router.push('/'); } else { setAddress(addr); }
  }, [router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return null;

  return (
    <div className="flex min-h-screen bg-arc-bg text-arc-text">
      <Sidebar />
      <main className="pz-shell flex-1">
        <div className="flex justify-end mb-8 hidden sm:flex">
          <UserProfile />
        </div>
        <div className="max-w-[480px] w-full">
          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-arc-cyan/10 text-arc-cyan border border-arc-cyan/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-arc-text">Accept Funds</h1>
            </div>
            <p className="text-sm font-medium mb-8 text-arc-textMuted">
              Scan this QR code or share your wallet address to receive Arc Testnet assets.
            </p>
            
            <div className="flex flex-col items-center">

            {/* QR Code */}
            <div className="bg-white p-4 rounded-3xl shadow-xl shadow-black/10 mb-8 inline-block border border-arc-border">
              <QRCodeCanvas value={`ethereum:${address}`} size={180} level="H" includeMargin={false} fgColor="#0F172A" />
            </div>

            {/* Address */}
            <div className="w-full p-4 rounded-2xl mb-6 text-left overflow-hidden bg-arc-panelStrong border border-arc-border">
              <p className="text-xs font-mono font-bold truncate text-arc-text tracking-tight">{address}</p>
            </div>

            {/* Copy Button */}
            <button onClick={handleCopy} className="pz-btn pz-btn-primary pz-btn-lg w-full !rounded-2xl shadow-lg shadow-arc-blue/20">
              {copied
                ? <><CheckCircle2 className="w-5 h-5" /> Copied Address</>
                : <><Copy className="w-5 h-5" /> Copy Wallet Address</>
              }
            </button>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
