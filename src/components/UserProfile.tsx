"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [avatarText, setAvatarText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const walletAddr = localStorage.getItem('walletAddress');

      if (session?.user?.email) {
        setIdentifier(session.user.email);
        setAvatarText(session.user.email[0].toUpperCase());
      } else if (walletAddr) {
        // Truncate wallet address: 0x1234...abcd
        setIdentifier(`${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`);
        // Use first two chars (usually '0X') for avatar
        setAvatarText(walletAddr.slice(2, 4).toUpperCase());
      }
    };

    fetchUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('walletAddress');
    router.push('/');
  };

  if (!identifier) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm bg-arc-panel border border-arc-border hover:border-arc-cyan/50 transition-all group"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-arc-blue group-hover:bg-arc-cyan transition-colors shadow-sm">
          {avatarText}
        </div>
        <span className="text-sm font-bold text-arc-text tracking-tight">{identifier}</span>
        <ChevronDown className={`w-4 h-4 text-arc-textMuted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-arc-panel backdrop-blur-xl rounded-2xl border border-arc-border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="px-4 py-2 border-b border-arc-border mb-1">
             <p className="text-[10px] font-bold text-arc-textMuted uppercase tracking-widest mb-0.5">Account</p>
             <p className="text-xs font-bold text-arc-text truncate">{identifier}</p>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-bold text-arc-textMuted hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
