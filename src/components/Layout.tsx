import React from 'react';
import SyncStatus from './SyncStatus';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils/urls';
import { UserButton } from '@clerk/clerk-react';

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
            <HeaderNavLink to={createPageUrl('Status')} label="Status" />
            <HeaderNavLink to={createPageUrl('Analytics')} label="Analytics" />
            <HeaderNavLink to={createPageUrl('Pricing')} label="Premium" />
          </nav>
          <div className="pointer-events-auto absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <div className="hidden md:block">
              <SyncStatus />
            </div>
            <UserButton 
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#2d4a3a',
                  colorBackground: '#0a0a0b',
                  colorInputBackground: '#0e0e10',
                  colorInputText: '#c4c4c6',
                  colorText: '#c4c4c6',
                  colorTextSecondary: '#8a8a8d',
                  colorTextOnPrimaryBackground: '#ffffff',
                  colorDanger: '#dc2626',
                  colorSuccess: '#2d4a3a',
                  colorWarning: '#f59e0b',
                  colorNeutral: '#8a8a8d',
                  colorShimmer: '#1a1a1d',
                  borderRadius: '0.375rem',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem'
                },
                elements: {
                  // Avatar styling
                  userButtonAvatarBox: 'w-8 h-8 border border-[#1a1a1d]',
                  avatarBox: 'border border-[#1a1a1d]',
                  avatarImage: 'rounded-full',
                  
                  // Popover styling
                  userButtonPopoverCard: 'bg-[#0a0a0b] border border-[#1a1a1d] shadow-xl',
                  userButtonPopoverActionButton: 'text-[#c4c4c6] hover:bg-[#1a1a1d] bg-transparent',
                  userButtonPopoverActionButtonText: 'text-[#c4c4c6]',
                  userButtonPopoverActionButtonIcon: 'text-[#8a8a8d]',
                  userButtonPopoverFooter: 'hidden',
                  userButtonPopoverMain: 'bg-[#0a0a0b]',
                  userButtonPopoverActions: 'bg-[#0a0a0b]',
                  userPreviewMainIdentifier: 'text-[#c4c4c6]',
                  userPreviewSecondaryIdentifier: 'text-[#8a8a8d]',
                  
                  // Modal and card styling
                  card: 'bg-[#0a0a0b] text-[#c4c4c6] border border-[#1a1a1d]',
                  rootBox: 'bg-[#0a0a0b]',
                  modalContent: 'bg-[#0a0a0b] text-[#c4c4c6] border border-[#1a1a1d]',
                  modalCloseButton: 'text-[#8a8a8d] hover:text-[#c4c4c6]',
                  modalBackdrop: 'bg-black/80',
                  
                  // Form elements
                  formFieldInput: 'bg-[#0e0e10] border-[#1a1a1d] text-[#c4c4c6] focus:border-[#2d4a3a]',
                  formFieldLabel: 'text-[#8a8a8d]',
                  formFieldInputShowPasswordButton: 'text-[#8a8a8d] hover:text-[#c4c4c6]',
                  formButtonPrimary: 'bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a]',
                  formButtonReset: 'text-[#8a8a8d] hover:text-[#c4c4c6]',
                  
                  // Profile page styling
                  profileSection: 'bg-[#0a0a0b] border border-[#1a1a1d]',
                  profileSectionTitle: 'text-[#c4c4c6]',
                  profileSectionTitleText: 'text-[#c4c4c6]',
                  profileSectionContent: 'bg-[#0a0a0b] text-[#c4c4c6]',
                  profileSectionPrimaryButton: 'bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a]',
                  
                  // Badge and misc
                  badge: 'bg-[#2d4a3a] text-[#c4c4c6]',
                  navbar: 'bg-[#0a0a0b] border-b border-[#1a1a1d]',
                  navbarButton: 'text-[#8a8a8d] hover:text-[#c4c4c6]',
                  headerTitle: 'text-[#c4c4c6]',
                  headerSubtitle: 'text-[#8a8a8d]',
                  
                  // Page and scrollbox
                  page: 'bg-[#0a0a0b]',
                  pageScrollBox: 'bg-[#0a0a0b]',
                  
                  // Footer
                  footer: 'bg-[#0a0a0b] border-t border-[#1a1a1d]',
                  footerAction: 'text-[#8a8a8d] hover:text-[#c4c4c6]',
                  footerActionLink: 'text-[#2d4a3a] hover:text-[#3d5a4a]',
                  
                  // Dividers and separators
                  dividerLine: 'bg-[#1a1a1d]',
                  dividerText: 'text-[#8a8a8d]'
                }
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Settings"
                  labelIcon={<span>⚙️</span>}
                  href={createPageUrl('Settings')}
                />
              </UserButton.MenuItems>
            </UserButton>
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
