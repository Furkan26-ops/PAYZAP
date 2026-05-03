"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowUpRight, ArrowDownUp,
  ArrowDownLeft, History, LogOut,
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
    <aside className="pz-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <Image
          src="/logo.png"
          alt="PAYZAP"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        />
        <span className="text-white font-bold tracking-tight text-[0.9375rem]">Payzap</span>
      </div>

      {/* Network badge */}
      <div className="mx-2 mb-6 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-2)' }}>Arc Testnet</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`pz-sidebar-link ${pathname === href ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-white/10 my-4" />

      {/* Sign out */}
      <button onClick={handleLogout} className="pz-sidebar-link">
        <LogOut className="w-4 h-4 flex-shrink-0" />
        Sign Out
      </button>
    </aside>
  );
}
