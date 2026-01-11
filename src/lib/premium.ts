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

function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PREM-';
  for (let i = 0; i < 16; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7 || i === 11) code += '-';
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
}

/**
 * Activate premium - ALL FLOWS CONVERGE HERE
 * Called by: Stripe success, manual code entry, redeem URL
 * Returns: activation code for backup
 */
export function activatePremium(userId?: string): string {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const code = generateActivationCode();

  const premiumData: PremiumStatus = {
    active: true,
    expiresAt: oneYearFromNow.toISOString(),
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
  const currentData = readPremiumData(userId);
  
  // If user already has premium with matching code, ensure it's active
  if (currentData?.activationCode === inputCode) {
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
export function clearPremiumData(userId?: string): void {
  const key = getStorageKey(userId);
  localStorage.removeItem(key);
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