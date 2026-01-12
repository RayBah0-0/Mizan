import React from 'react';
import SyncStatus from './SyncStatus';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils/urls';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const hideHeader = location.pathname === '/' || location.pathname === '/access';

  return (
    <div className="min-h-screen antialiased">
      {!hideHeader && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 md:px-6 py-3 md:py-4 pointer-events-none bg-[#0a0a0b]/85 backdrop-blur border-b border-[#151519]">
          <nav className="flex items-center gap-2 md:gap-3 pointer-events-auto overflow-x-auto">
            <HeaderNavLink to={createPageUrl('Landing')} label="Mizan" />
            <HeaderNavLink to={createPageUrl('CheckIn')} label="Daily" />
            <HeaderNavLink to={createPageUrl('Cycle')} label="Cycle" />
            <HeaderNavLink to={createPageUrl('Status')} label="Status" />
            <HeaderNavLink to={createPageUrl('Analytics')} label="Analytics" />
            <HeaderNavLink to={createPageUrl('Pricing')} label="Premium" />
            <HeaderNavLink to={createPageUrl('Settings')} label="Settings" />
          </nav>
          <div className="pointer-events-auto absolute right-4 md:right-6 top-1/2 -translate-y-1/2 hidden md:block">
            <SyncStatus />
          </div>
        </header>
      )}
      <div className={hideHeader ? '' : 'pt-16 md:pt-16'}>
        {children}
      </div>
    </div>
  );
}

function HeaderNavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-[#d6d6d8] text-[10px] md:text-[11px] tracking-[0.2em] md:tracking-[0.22em] uppercase bg-transparent border border-[#1a1a1d]/50 px-3 md:px-5 py-2 rounded-md transition-all duration-250 hover:border-[#2d4a3a]/90 hover:text-white hover:-translate-y-[1px] active:translate-y-0 whitespace-nowrap"
    >
      {label}
    </Link>
  );
}
