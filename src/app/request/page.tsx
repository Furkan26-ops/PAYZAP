"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Sidebar from '@/components/Sidebar';

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
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <div className="pz-page-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 className="pz-page-title">Accept</h1>
              <p className="pz-page-subtitle">Share your QR code or wallet address to receive funds.</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-soft)' }}>
              <QrCode className="w-5 h-5" style={{ color: 'var(--green)' }} />
            </div>
          </div>

          <div className="pz-card">
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              Ask the sender to scan this QR code with their PAYZAP app to send you funds.
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-5">
              <div className="bg-white p-5 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--border)' }}>
                <QRCodeCanvas value={`ethereum:${address}`} size={190} level="H" includeMargin={false} fgColor="#0F172A" />
              </div>
            </div>

            {/* Address */}
            <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
                Your Arc Wallet Address
              </p>
              <p className="text-xs font-mono break-all" style={{ color: 'var(--text-2)' }}>{address}</p>
            </div>

            {/* Copy Button */}
            <button onClick={handleCopy} className="pz-btn pz-btn-primary pz-btn-lg w-full">
              {copied
                ? <><CheckCircle2 className="w-5 h-5" /> Copied!</>
                : <><Copy className="w-5 h-5" /> Copy Address</>
              }
            </button>

            <p className="text-xs text-center mt-4" style={{ color: 'var(--muted-2)' }}>
              Only accept native USDC on the Arc Testnet.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
