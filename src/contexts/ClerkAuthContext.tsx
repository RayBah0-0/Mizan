import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { getPremiumStatus, clearPremiumCache, PremiumStatus } from '../lib/premium';

interface User {
  id: string;
  email: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  premiumStatus: PremiumStatus;
  premiumLoading: boolean;
  refreshPremium: () => Promise<void>;
}

const ClerkAuthContext = createContext<AuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ active: false, expiresAt: null });
  const [premiumLoading, setPremiumLoading] = useState(true);

  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        username: clerkUser.username || clerkUser.firstName || undefined,
      }
    : null;

  // Fetch premium status on login/refresh
  const refreshPremium = async () => {
    if (!user?.id) {
      setPremiumStatus({ active: false, expiresAt: null });
      setPremiumLoading(false);
      return;
    }

    setPremiumLoading(true);
    try {
      const status = await getPremiumStatus(user.id);
      setPremiumStatus(status);
    } catch (error) {
      console.error('Failed to fetch premium status:', error);
      setPremiumStatus({ active: false, expiresAt: null });
    } finally {
      setPremiumLoading(false);
    }
  };

  // Fetch premium when user logs in or changes
  useEffect(() => {
    if (isLoaded) {
      refreshPremium();
    }
  }, [user?.id, isLoaded]);

  const signOut = async () => {
    if (user?.id) {
      clearPremiumCache(user.id);
    }
    await clerkSignOut();
  };

  const value = {
    user,
    signOut,
    isLoading: !isLoaded,
    premiumStatus,
    premiumLoading,
    refreshPremium,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  );
}

export function useClerkAuth() {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useClerkAuth must be used within ClerkAuthProvider');
  }
  return context;
}
