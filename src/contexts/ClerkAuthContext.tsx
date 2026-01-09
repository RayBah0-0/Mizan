import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

interface User {
  id: string;
  email: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const ClerkAuthContext = createContext<AuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        username: clerkUser.username || clerkUser.firstName || undefined,
      }
    : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  const value = {
    user,
    signOut,
    isLoading: !isLoaded,
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
