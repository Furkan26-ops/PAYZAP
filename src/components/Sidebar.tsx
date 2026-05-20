"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowUpRight, ArrowDownUp,
  ArrowDownLeft, History, LogOut
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/send',      icon: ArrowUpRight,    label: 'Send'      },
  { href: '/swap',      icon: ArrowDownUp,     label: 'Swap'      },
  { href: '/request',   icon: ArrowDownLeft,   label: 'Receive'   },
  { href: '/history',   icon: History,         label: 'Activity'  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('walletAddress');
    router.push('/');
  };

  return (
    <aside className="pz-sidebar border-arc-border bg-arc-panel/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="hidden md:flex items-center gap-2.5 px-2 mb-8">
        <Image
          src="/logo.png"
          alt="PAYZAP"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-lg shadow-arc-cyan/20"
        />
        <span className="font-bold tracking-tight text-[1rem] text-arc-text">Payzap</span>
      </div>

      {/* Network badge */}
      <div className="hidden md:flex mx-2 mb-6 items-center gap-2 bg-arc-panelStrong border border-arc-border rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-arc-textMuted">Arc Testnet</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-row md:flex-col w-full justify-around md:justify-start gap-1 md:gap-1.5 flex-1 md:mt-2">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`pz-sidebar-link group transition-all duration-200 !rounded-full ${
              pathname === href 
                ? 'active !bg-blue-600 !text-white shadow-md shadow-blue-500/20' 
                : '!text-slate-500 hover:!text-slate-900 md:hover:!bg-slate-50'
            }`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${pathname === href ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
            <span className="font-medium text-[10px] md:text-sm">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="hidden md:block mt-auto pt-4 w-full">
        <button 
          className="flex items-center gap-3 px-4 py-3 w-full rounded-full font-bold text-red-500 hover:bg-red-50 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </aside>
  );
}
