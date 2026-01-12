/**
 * Premium subscription management - SINGLE SOURCE OF TRUTH
 * 
 * RULES:
 * 1. This file is the ONLY authority on premium status
 * 2. UI components READ ONLY via getPremiumStatus()
 * 3. All activation flows converge to activatePremium()
 * 4. No "pending" states - premium is either ON or OFF
 * 5. Stripe is just a trigger, not a decision maker
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PremiumStatus {
  active: boolean;
  expiresAt: string | null;
  activationCode: string | null;
}

// ============================================================================
// INTERNAL HELPERS (NOT EXPORTED)
// ============================================================================

function getStorageKey(userId?: string): string {
  // Use provided userId or fallback to 'guest'
  const user = userId || 'guest';
  return `mizan_premium_${user}`;
}

function generateActivationCode(plan: 'monthly' | 'commitment' | 'lifetime' = 'monthly'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Plan-specific prefixes
  let prefix: string;
  if (plan === 'lifetime') {
    prefix = 'LIFE:';
  } else if (plan === 'commitment') {
    prefix = 'CMTM:';
  } else {
    prefix = 'YRLY:';
  }
  
  // Generate 10 random characters
  let code = prefix;
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function readPremiumData(userId?: string): PremiumStatus | null {
  try {
    const key = getStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to read premium data:', e);
    return null;
  }
}

function writePremiumData(data: PremiumStatus, userId?: string): void {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write premium data:', e);
  }
}

// ============================================================================
// PUBLIC API - THE ONLY EXPORTS COMPONENTS SHOULD USE
// ============================================================================

/**
 * Get premium status - THE SINGLE SOURCE OF TRUTH
 * This is the ONLY function UI components should call
 * Returns: { active: boolean, expiresAt: string | null, activationCode: string | null }
 */
export function getPremiumStatus(userId?: string): PremiumStatus {
  try {
    const data = readPremiumData(userId);
    
    if (!data) {
      return { active: false, expiresAt: null, activationCode: null };
    }

    // Auto-expire check
    if (data.expiresAt) {
      const expiry = new Date(data.expiresAt);
      const now = new Date();
      
      if (now > expiry) {
        // Expired - clear and return inactive
        clearPremiumData(userId);
        return { active: false, expiresAt: null, activationCode: null };
      }
    }

    return data;
  } catch (error) {
    console.error('Error getting premium status:', error);
    return { active: false, expiresAt: null, activationCode: null };
  }
}

/**
 * Activate premium - ALL FLOWS CONVERGE HERE
 * Called by: Stripe success, manual code entry, redeem URL
 * Returns: activation code for backup
 */
export function activatePremium(userId?: string, plan: 'monthly' | 'commitment' | 'lifetime' = 'monthly', forceNewCode: boolean = false): string {
  let expiresAt: string | null;
  
  if (plan === 'lifetime') {
    expiresAt = null; // No expiration
  } else if (plan === 'commitment') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    expiresAt = threeMonthsFromNow.toISOString();
  } else {
    // monthly (1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    expiresAt = oneYearFromNow.toISOString();
  }

  // Generate new code for Stripe purchases, or preserve existing for other flows
  const existing = readPremiumData(userId);
  const code = forceNewCode ? generateActivationCode(plan) : (existing?.activationCode || generateActivationCode(plan));

  const premiumData: PremiumStatus = {
    active: true,
    expiresAt,
    activationCode: code,
  };

  writePremiumData(premiumData, userId);
  
  return code;
}

/**
 * Validate and activate with backup code
 * Returns: true if code matched and activated, false otherwise
 */
export function activateWithCode(inputCode: string, userId?: string): boolean {
  // Valid preset codes
  const validCodes = ['PREMIUM2025', 'LIFETIME2025'];
  const normalizedInput = inputCode.toUpperCase().trim();
  
  // Check if it's a valid preset code
  if (validCodes.includes(normalizedInput)) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    writePremiumData({
      active: true,
      expiresAt: oneYearFromNow.toISOString(),
      activationCode: normalizedInput,
    }, userId);
    
    return true;
  }
  
  const currentData = readPremiumData(userId);
  
  // If user already has premium with matching code, ensure it's active
  if (currentData?.activationCode === normalizedInput) {
    // Reactivate for another year
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    writePremiumData({
      active: true,
      expiresAt: oneYearFromNow.toISOString(),
      activationCode: currentData.activationCode,
    }, userId);
    
    return true;
  }

  return false;
}

/**
 * Clear all premium data for user
 */
/**
 * Clear premium status but preserve activation code for reactivation
 */
export function clearPremiumData(userId?: string): void {
  const status = getPremiumStatus(userId);
  
  // Preserve the activation code but clear active status
  writePremiumData({
    active: false,
    expiresAt: null,
    activationCode: status.activationCode, // Keep code for reactivation
  }, userId);
}

// ============================================================================
// LEGACY COMPATIBILITY - Kept for existing code, but marked as deprecated
// ============================================================================

/** @deprecated Use getPremiumStatus().active instead */
export function isPremiumEnabled(userId?: string): boolean {
  return getPremiumStatus(userId).active;
}

/** @deprecated Use getPremiumStatus().expiresAt instead */
export function getPremiumExpiryDate(userId?: string): Date | null {
  const status = getPremiumStatus(userId);
  return status.expiresAt ? new Date(status.expiresAt) : null;
}

/** @deprecated Use getPremiumStatus().activationCode instead */
export function getActivationCode(userId?: string): string | null {
  return getPremiumStatus(userId).activationCode;
}

// ============================================================================
// MIGRATION & CLEANUP
// ============================================================================

/**
 * Migrate old premium data structure to new consolidated format
 */
export function migrateOldPremiumData(userId: string): void {
  // Check for old format
  const oldKeys = [
    `premium_enabled_${userId}`,
    `premium_expires_at_${userId}`,
    `premium_activation_code_${userId}`,
    `premium_pending_${userId}`, // Remove pending flags
  ];

  const hasOldData = oldKeys.some(key => localStorage.getItem(key) !== null);
  
  if (hasOldData) {
    // Read old data
    const wasEnabled = localStorage.getItem(`premium_enabled_${userId}`) === 'true';
    const oldExpiry = localStorage.getItem(`premium_expires_at_${userId}`);
    const oldCode = localStorage.getItem(`premium_activation_code_${userId}`);

    if (wasEnabled && oldExpiry) {
      // Migrate to new format
      writePremiumData({
        active: true,
        expiresAt: oldExpiry,
        activationCode: oldCode,
      }, userId);
    }

    // Clean up old keys
    oldKeys.forEach(key => localStorage.removeItem(key));
  }

  // Also clear undefined/guest keys that might have accumulated
  const keysToClean = [
    'premium_enabled_undefined',
    'premium_expires_at_undefined',
    'premium_activation_code_undefined',
    'premium_pending_undefined',
    'premium_enabled_guest',
    'premium_expires_at_guest',
    'premium_activation_code_guest',
    'premium_pending_guest',
  ];
  keysToClean.forEach(key => localStorage.removeItem(key));
}