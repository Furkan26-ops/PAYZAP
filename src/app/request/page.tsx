"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2 } from 'lucide-react';
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
      <main className="pz-shell flex-1 flex flex-col items-center sm:items-start">
        <div className="w-full max-w-sm">
          <div className="pz-card text-center flex flex-col items-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Accept Funds</h1>
            <p className="text-sm font-medium px-4 mb-6" style={{ color: 'var(--muted)' }}>
              Use your automatically generated Arc Testnet wallet address.
            </p>

            {/* QR Code */}
            <div className="bg-white p-3 rounded-2xl border shadow-sm mb-6 inline-block" style={{ borderColor: 'var(--border)' }}>
              <QRCodeCanvas value={`ethereum:${address}`} size={160} level="H" includeMargin={false} fgColor="#0F172A" />
            </div>

            {/* Address */}
            <div className="w-full p-3 rounded-lg mb-4 text-left overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono font-medium truncate" style={{ color: 'var(--text)' }}>{address}</p>
            </div>

            {/* Copy Button */}
            <button onClick={handleCopy} className="pz-btn pz-btn-primary pz-btn-lg w-full">
              {copied
                ? <><CheckCircle2 className="w-5 h-5" /> Copied!</>
                : <><Copy className="w-5 h-5" /> Copy Address</>
              }
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
