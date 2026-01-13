/**
 * Premium subscription management - SERVER IS THE AUTHORITY
 * 
 * ARCHITECTURE:
 * - Server is the ONLY source of truth for premium status
 * - localStorage is a CACHE ONLY for offline use
 * - Frontend NEVER calculates or infers premium status
 * - Three states: Active, Inactive, Expired
 * - No pending states, no flags, no special cases
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PremiumStatus {
  active: boolean;
  expiresAt: string | null;
}

// ============================================================================
// CACHE HELPERS (localStorage is ONLY a cache)
// ============================================================================

function getCacheKey(userId: string): string {
  return `mizan_premium_cache_${userId}`;
}

function readFromCache(userId: string): PremiumStatus | null {
  try {
    const data = localStorage.getItem(getCacheKey(userId));
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to read premium cache:', e);
    return null;
  }
}

function writeToCache(userId: string, status: PremiumStatus): void {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(status));
  } catch (e) {
    console.error('Failed to write premium cache:', e);
  }
}

function clearCache(userId: string): void {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch (e) {
    console.error('Failed to clear premium cache:', e);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch premium status from SERVER (source of truth)
 * Always call this on login, refresh, or when you need fresh status
 * Caches the result for offline use
 */
export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  if (!userId) {
    return { active: false, expiresAt: null };
  }

  try {
    const response = await fetch(`/api/data/premium-status?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const status: PremiumStatus = {
      active: data.active,
      expiresAt: data.expiresAt
    };

    // Cache for offline use
    writeToCache(userId, status);
    
    return status;
  } catch (error) {
    console.warn('Failed to fetch premium from server, using cache:', error);
    
    // Fallback to cache if server unreachable
    const cached = readFromCache(userId);
    if (cached) {
      return cached;
    }

    // No cache available
    return { active: false, expiresAt: null };
  }
}

/**
 * Read premium status from CACHE ONLY (for offline/sync reads)
 * Use this when you can't await, but prefer getPremiumStatus() when possible
 */
export function getPremiumStatusSync(userId: string): PremiumStatus {
  if (!userId) {
    return { active: false, expiresAt: null };
  }

  const cached = readFromCache(userId);
  if (cached) {
    return cached;
  }

  return { active: false, expiresAt: null };
}

/**
 * Activate premium on the SERVER
 * Called after successful Stripe payment
 * Server becomes the authority immediately
 */
export async function activatePremium(userId: string, plan: 'monthly' | 'commitment' | 'lifetime'): Promise<boolean> {
  if (!userId) {
    throw new Error('userId required to activate premium');
  }

  let expiresAt: string | null;
  
  if (plan === 'lifetime') {
    expiresAt = null;
  } else if (plan === 'commitment') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    expiresAt = threeMonthsFromNow.toISOString();
  } else {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    expiresAt = oneYearFromNow.toISOString();
  }

  try {
    const response = await fetch('/api/data/set-premium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, plan, expiresAt })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to activate premium: ${response.status}`);
    }

    // Immediately fetch fresh status to update cache
    await getPremiumStatus(userId);
    
    return true;
  } catch (error) {
    console.error('Failed to activate premium:', error);
    return false;
  }
}

/**
 * Clear cache (useful for logout)
 */
export function clearPremiumCache(userId: string): void {
  clearCache(userId);
}
