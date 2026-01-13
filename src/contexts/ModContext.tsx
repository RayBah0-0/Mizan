import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClerkAuth } from './ClerkAuthContext';
import { API_URL } from '../utils/api';

// ⚠️ CRITICAL: This context is for UI convenience ONLY.
// NEVER use ModContext to authorize actions.
// ALL authorization MUST happen server-side via mod_level checks.
// If you bypass server checks because "the user is a mod in context", you create a security hole.

type ModLevel = 'none' | 'read_only' | 'full' | 'super_admin';

interface ModContextValue {
  isMod: boolean;
  modLevel: ModLevel;
  grantedAt: string | null;
  loading: boolean;
  checkModStatus: () => Promise<void>;
}

const ModContext = createContext<ModContextValue | undefined>(undefined);

export function ModProvider({ children }: { children: React.ReactNode }) {
  const { user } = useClerkAuth();
  const [isMod, setIsMod] = useState(false);
  const [modLevel, setModLevel] = useState<ModLevel>('none');
  const [grantedAt, setGrantedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkModStatus = async () => {
    if (!user) {
      setIsMod(false);
      setModLevel('none');
      setGrantedAt(null);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('mizan_token');
      if (!token) {
        setIsMod(false);
        setModLevel('none');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/mod/check-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsMod(data.isMod);
        setModLevel(data.modLevel);
        setGrantedAt(data.grantedAt || null);
      } else {
        setIsMod(false);
        setModLevel('none');
        setGrantedAt(null);
      }
    } catch (error) {
      console.error('Failed to check mod status:', error);
      setIsMod(false);
      setModLevel('none');
      setGrantedAt(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkModStatus();
  }, [user]);

  return (
    <ModContext.Provider value={{ isMod, modLevel, grantedAt, loading, checkModStatus }}>
      {children}
    </ModContext.Provider>
  );
}

export function useMod() {
  const context = useContext(ModContext);
  if (context === undefined) {
    throw new Error('useMod must be used within a ModProvider');
  }
  return context;
}
