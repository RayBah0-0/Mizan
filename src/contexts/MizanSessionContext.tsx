import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { getMizanSession, saveSettings, getOrCreateClerkToken } from '@/utils/api';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

const SESSION_CACHE_KEY = 'mizan_session_cache_v1';

interface FeatureFlags {
  premiumV2: boolean;
  mizanStrictMode: boolean;
  [key: string]: boolean;
}

interface RawSessionResponse {
  id: number;
  username: string;
  subscription?: {
    tier: string;
    subscriptionEndsAt: string | null;
  };
  pledgeAcceptedAt?: string | null;
  premiumStartedAt?: string | null;
  commitmentEndsAt?: string | null;
  schemaVersion?: number;
  settings?: Record<string, unknown>;
  featureFlags?: FeatureFlags;
  paywallReason?: { code: string; feature: string } | null;
}

export interface MizanSessionState {
  isPremium: boolean;
  premiumUntil: string | null;
  featureFlags: FeatureFlags;
  schemaVersion: number;
  commitmentEndsAt: string | null;
  pledgeAcceptedAt: string | null;
  paywallHint: { code: string; feature: string } | null;
  isLoading: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  saveStrictness: (level: number) => Promise<void>;
}

interface SessionContextValue extends MizanSessionState {}

const defaultFlags: FeatureFlags = { premiumV2: false, mizanStrictMode: false };

function readCache(): Partial<MizanSessionState> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse session cache', err);
    return null;
  }
}

function writeCache(payload: Partial<MizanSessionState>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to write session cache', err);
  }
}

function derivePremium(subscription?: RawSessionResponse['subscription']) {
  if (!subscription) return { isPremium: false, premiumUntil: null };
  const expires = subscription.subscriptionEndsAt ? new Date(subscription.subscriptionEndsAt) : null;
  const active = subscription.tier === 'premium' && (!expires || expires > new Date());
  return { isPremium: active, premiumUntil: subscription.subscriptionEndsAt || null };
}

const MizanSessionContext = createContext<SessionContextValue | undefined>(undefined);

export function MizanSessionProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useClerkAuth();
  const [state, setState] = useState<MizanSessionState>(() => {
    const cached = readCache();
    return {
      isPremium: false,
      premiumUntil: null,
      featureFlags: { ...defaultFlags, ...(cached?.featureFlags || {}) },
      schemaVersion: cached?.schemaVersion || 1,
      commitmentEndsAt: cached?.commitmentEndsAt || null,
      pledgeAcceptedAt: cached?.pledgeAcceptedAt || null,
      paywallHint: cached?.paywallHint || null,
      isLoading: true,
      isStale: true,
      refetch: async () => {},
      saveStrictness: async () => {}
    };
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        // If Clerk user is available but no Mizan token, create one
        if (clerkUser && clerkUser.id && clerkUser.email) {
          let token = localStorage.getItem('mizan_token');
          if (!token) {
            console.log('Creating Mizan token for Clerk user:', clerkUser.email);
            const result = await getOrCreateClerkToken(clerkUser.id, clerkUser.email, clerkUser.username);
            if (result.token) {
              localStorage.setItem('mizan_token', result.token);
            }
          }
        }

        const token = localStorage.getItem('mizan_token');
        if (!token) {
          if (active) {
            setState((prev) => ({ ...prev, isPremium: false, premiumUntil: null, isLoading: false, isStale: false }));
          }
          return;
        }

        const payload: RawSessionResponse = await getMizanSession();
        if (!active) return;

        const { isPremium, premiumUntil } = derivePremium(payload.subscription);
        const next: MizanSessionState = {
          isPremium,
          premiumUntil,
          featureFlags: { ...defaultFlags, ...(payload.featureFlags || {}) },
          schemaVersion: payload.schemaVersion || 1,
          commitmentEndsAt: payload.commitmentEndsAt || null,
          pledgeAcceptedAt: payload.pledgeAcceptedAt || null,
          paywallHint: payload.paywallReason || null,
          isLoading: false,
          isStale: false,
          refetch: async () => {},
          saveStrictness: async () => {}
        };

        setState({ ...next });
        writeCache({ ...next, isLoading: false, isStale: false });
      } catch (err) {
        console.warn('Session load failed, falling back to cache', err);
        const cached = readCache();
        if (!active) return;
        setState((prev) => ({
          ...prev,
          isPremium: false,
          premiumUntil: null,
          featureFlags: { ...defaultFlags, ...(cached?.featureFlags || {}) },
          schemaVersion: cached?.schemaVersion || prev.schemaVersion,
          commitmentEndsAt: cached?.commitmentEndsAt || null,
          pledgeAcceptedAt: cached?.pledgeAcceptedAt || null,
          paywallHint: cached?.paywallHint || null,
          isLoading: false,
          isStale: true
        }));
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [clerkUser]);

  const value = useMemo<SessionContextValue>(() => {
    return {
      ...state,
      refetch: async () => {
        try {
          setState((prev) => ({ ...prev, isLoading: true }));
          const payload: RawSessionResponse = await getMizanSession();
          const { isPremium, premiumUntil } = derivePremium(payload.subscription);
          const next: MizanSessionState = {
            isPremium,
            premiumUntil,
            featureFlags: { ...defaultFlags, ...(payload.featureFlags || {}) },
            schemaVersion: payload.schemaVersion || 1,
            commitmentEndsAt: payload.commitmentEndsAt || null,
            pledgeAcceptedAt: payload.pledgeAcceptedAt || null,
            paywallHint: payload.paywallReason || null,
            isLoading: false,
            isStale: false,
            refetch: async () => {},
            saveStrictness: async () => {}
          };
          setState({ ...next });
          writeCache({ ...next, isLoading: false, isStale: false });
        } catch (err) {
          console.warn('Session refetch failed', err);
          setState((prev) => ({ ...prev, isLoading: false, isStale: true }));
        }
      },
      saveStrictness: async (level: number) => {
        const clamped = Math.max(1, Math.min(5, level));
        await saveSettings({ strictnessLevel: clamped });
        await state.refetch();
      }
    };
  }, [state]);

  return (
    <MizanSessionContext.Provider value={value}>
      {children}
    </MizanSessionContext.Provider>
  );
}

export function useMizanSession() {
  const ctx = useContext(MizanSessionContext);
  if (!ctx) {
    throw new Error('useMizanSession must be used within MizanSessionProvider');
  }
  return ctx;
}
