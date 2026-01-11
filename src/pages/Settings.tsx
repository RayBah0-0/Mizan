import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useMizanSession } from '@/contexts/MizanSessionContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useClerkAuth();
  const { isPremium } = useMizanSession();

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-[#c4c4c6] flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p>Settings require authentication. Please log in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#c4c4c6] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-light tracking-wide mb-2">Settings</h1>
          <p className="text-[#5a5a5d] text-sm">Adjust accountability rules and manage data.</p>
        </div>

        <section className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
          <h2 className="text-[#c4c4c6] text-sm tracking-wide mb-3">Account</h2>
          <div className="space-y-3">
            <p className="text-[#5a5a5d] text-sm">Logged in as <span className="text-[#8a8a8d]">{user.email}</span></p>
            <p className="text-[#5a5a5d] text-sm">Premium: <span className="text-[#8a8a8d]">{isPremium ? '✅ Active' : 'Inactive'}</span></p>
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate(createPageUrl('Access'));
              }}
              className="flex items-center gap-2 text-[#6a6a6d] hover:text-[#c4c4c6] text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
