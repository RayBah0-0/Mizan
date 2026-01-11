/**
 * Premium subscription management using localStorage
 * Frontend-only MVP solution with user-specific storage
 */

import { readUser } from '@/utils/storage';

function getUserKey(baseKey: string): string {
  const user = readUser() || 'guest';
  return `${baseKey}_${user}`;
}

export function isPremiumEnabled(): boolean {
  const enabled = localStorage.getItem(getUserKey("premium_enabled")) === "true";
  if (!enabled) return false;

  // Check if expired
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at"));
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (now > expiry) {
      // Auto-expire premium
      clearPremiumStates();
      return false;
    }
  }

  return true;
}

export function isPremiumPending(): boolean {
  return localStorage.getItem(getUserKey("premium_pending")) === "true";
}

export function isPremiumExpired(): boolean {
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at"));
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const now = new Date();
  return now > expiry;
}

export function activatePremium(): string {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  localStorage.setItem(getUserKey("premium_enabled"), "true");
  localStorage.setItem(getUserKey("premium_expires_at"), oneYearFromNow.toISOString());
  localStorage.setItem(getUserKey("premium_activation_code"), generateActivationCode());
  localStorage.removeItem(getUserKey("premium_pending"));

  // Return the code instead of showing alert
  return localStorage.getItem(getUserKey("premium_activation_code")) || "";
}

export function getActivationCode(): string | null {
  return localStorage.getItem(getUserKey("premium_activation_code"));
}

export function activateWithCode(code: string): boolean {
  const storedCode = localStorage.getItem(getUserKey("premium_activation_code"));
  if (storedCode === code) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    localStorage.setItem(getUserKey("premium_enabled"), "true");
    localStorage.setItem(getUserKey("premium_expires_at"), oneYearFromNow.toISOString());
    return true;
  }
  return false;
}

export function getPremiumExpiryDate(): Date | null {
  const expiryDate = localStorage.getItem(getUserKey("premium_expires_at"));
  return expiryDate ? new Date(expiryDate) : null;
}

export function setPremiumPending(): void {
  localStorage.setItem(getUserKey("premium_pending"), "true");
}

export function clearPremiumStates(): void {
  localStorage.removeItem(getUserKey("premium_enabled"));
  localStorage.removeItem(getUserKey("premium_pending"));
  localStorage.removeItem(getUserKey("premium_expires_at"));
  // Keep activation code for reactivation
}

// Check for Stripe redirect with payment=success
export function checkStripeRedirect(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('payment') === 'success';
}

// Handle Stripe redirect - call this on dashboard mount
export function handleStripeRedirect(): void {
  if (checkStripeRedirect()) {
    setPremiumPending();
    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.toString());
  }
}

function generateActivationCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}