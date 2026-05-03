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
    const storedAddr = localStorage.getItem('walletAddress');
    if (!storedAddr) { router.push('/'); } else { setAddress(storedAddr); }
  }, [router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return null;

  const qrData = `ethereum:${address}`;

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <Sidebar />
      <main className="pz-shell flex-1 flex items-start">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-1">Accept</h1>
          <p className="text-sm text-[#64748B] mb-8">
            Your automatically generated Arc wallet address.
          </p>

          <div className="pz-card flex flex-col items-center">
            <p className="text-sm text-[#64748B] text-center mb-6">
              Ask the sender to scan this QR code with their PAYZAP app to send you funds.
            </p>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-md mb-6">
              <QRCodeCanvas
                value={qrData}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#0F172A"
              />
            </div>

            {/* Address */}
            <div className="w-full mb-6 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <p className="text-xs font-mono text-[#64748B] break-all text-center">{address}</p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="pz-btn-primary w-full justify-center text-base"
            >
              {copied ? (
                <><CheckCircle2 className="w-5 h-5" /> Copied!</>
              ) : (
                <><Copy className="w-5 h-5" /> Copy Address</>
              )}
            </button>

            <p className="text-xs text-[#94A3B8] mt-4 text-center">
              Only accept native USDC on Arc Testnet.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
