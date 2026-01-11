/**
 * Premium subscription management using localStorage
 * Frontend-only MVP solution with user-specific storage
 */

import { readUser } from '@/utils/storage';

// Get current user ID from Clerk (more reliable than stored username)
function getCurrentUserId(): string {
  // Try to get user from Clerk context if available
  try {
    // This is a workaround - we need to access the current user somehow
    // For now, let's use a combination of approaches
    const clerkUser = (window as any).Clerk?.user;
    if (clerkUser?.id) {
      return clerkUser.id;
    }
  } catch (e) {
    // Fall back to stored user
  }

  // Fall back to stored username for backward compatibility
  return readUser() || 'guest';
}

function getUserKey(baseKey: string, userId?: string): string {
  const user = userId || getCurrentUserId();
  return `${baseKey}_${user}`;
}

export function isPremiumEnabled(userId?: string): boolean {
  const enabled = localStorage.getItem(getUserKey("premium_enabled", userId)) === "true";
  if (!enabled) return false;

  // Check if expired
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at", userId));
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (now > expiry) {
      // Auto-expire premium
      clearPremiumStates(userId);
      return false;
    }
  }

  return true;
}

export function isPremiumPending(userId?: string): boolean {
  return localStorage.getItem(getUserKey("premium_pending", userId)) === "true";
}

export function isPremiumExpired(userId?: string): boolean {
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at", userId));
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const now = new Date();
  return now > expiry;
}

export function activatePremium(userId?: string): string {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  localStorage.setItem(getUserKey("premium_enabled", userId), "true");
  localStorage.setItem(getUserKey("premium_expires_at", userId), oneYearFromNow.toISOString());
  localStorage.setItem(getUserKey("premium_activation_code", userId), generateActivationCode());
  localStorage.removeItem(getUserKey("premium_pending", userId));

  // Return the code instead of showing alert
  return localStorage.getItem(getUserKey("premium_activation_code", userId)) || "";
}

export function getActivationCode(userId?: string): string | null {
  return localStorage.getItem(getUserKey("premium_activation_code", userId));
}

export function activateWithCode(code: string, userId?: string): boolean {
  const storedCode = localStorage.getItem(getUserKey("premium_activation_code", userId));
  if (storedCode === code) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    localStorage.setItem(getUserKey("premium_enabled", userId), "true");
    localStorage.setItem(getUserKey("premium_expires_at", userId), oneYearFromNow.toISOString());
    return true;
  }
  return false;
}

export function getPremiumExpiryDate(userId?: string): Date | null {
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at", userId));
  return expiryDate ? new Date(expiryDate) : null;
}

export function setPremiumPending(userId?: string): void {
  localStorage.setItem(getUserKey("premium_pending", userId), "true");
}

export function clearPremiumStates(userId?: string): void {
  localStorage.removeItem(getUserKey("premium_enabled", userId));
  localStorage.removeItem(getUserKey("premium_pending", userId));
  localStorage.removeItem(getUserKey("premium_expires_at", userId));
  localStorage.removeItem(getUserKey("premium_activation_code", userId));
}

export function migrateOldPremiumData(userId: string): void {
  // Clear any old premium data that might be using stored username
  const oldUser = readUser() || 'guest';
  if (oldUser !== userId) {
    const oldKeys = [
      `premium_enabled_${oldUser}`,
      `premium_pending_${oldUser}`,
      `premium_expires_at_${oldUser}`,
      `premium_activation_code_${oldUser}`
    ];
    oldKeys.forEach(key => localStorage.removeItem(key));
  }

  // Also clear any undefined keys that might have been created during loading
  const undefinedKeys = [
    'premium_enabled_undefined',
    'premium_pending_undefined',
    'premium_expires_at_undefined',
    'premium_activation_code_undefined'
  ];
  undefinedKeys.forEach(key => localStorage.removeItem(key));
}

export function clearUserPremiumData(): void {
  const user = readUser() || 'guest';
  const keysToRemove = [
    `premium_enabled_${user}`,
    `premium_pending_${user}`,
    `premium_expires_at_${user}`,
    `premium_activation_code_${user}`
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
}

export function debugPremiumKeys(): void {
  const allKeys = Object.keys(localStorage).filter(key => key.includes('premium_'));
  console.log('Premium keys in localStorage:', allKeys);
  const currentUser = readUser() || 'guest';
  console.log('Current user:', currentUser);
}

// Check for Stripe redirect with payment=success
export function checkStripeRedirect(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('payment') === 'success';
}

// Handle Stripe redirect - call this on dashboard mount
export function handleStripeRedirect(userId?: string): void {
  if (checkStripeRedirect()) {
    setPremiumPending(userId);
    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.toString());
  }
}

function generateActivationCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}