"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowUpRight, ArrowDownUp,
  ArrowDownLeft, History,
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
      <div className="flex items-center gap-2.5 px-2 mb-8">
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
      <div className="mx-2 mb-6 flex items-center gap-2 bg-arc-panelStrong border border-arc-border rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-arc-textMuted">Arc Testnet</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`pz-sidebar-link group transition-all duration-200 ${
              pathname === href 
                ? 'bg-arc-panelStrong text-arc-cyan border-r-2 border-arc-cyan' 
                : 'text-arc-textMuted hover:text-arc-text hover:bg-arc-panelStrong/50'
            }`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${pathname === href ? 'text-arc-cyan' : 'text-arc-textMuted group-hover:text-arc-text'}`} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
