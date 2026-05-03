"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownUp,
  ArrowDownLeft,
  History,
  LogOut,
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
          className="w-8 h-8 rounded-lg object-cover"
        />
        <span className="text-white font-extrabold tracking-tight text-base">Payzap</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
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

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="pz-sidebar-link w-full mt-4 text-left"
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        Sign Out
      </button>
    </aside>
  );
}
