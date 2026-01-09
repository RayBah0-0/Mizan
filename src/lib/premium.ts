/**
 * Premium subscription management using localStorage
 * Frontend-only MVP solution
 */

export function isPremiumEnabled(): boolean {
  return localStorage.getItem("premium_enabled") === "true";
}

export function isPremiumPending(): boolean {
  return localStorage.getItem("premium_pending") === "true";
}

export function activatePremium(): void {
  localStorage.setItem("premium_enabled", "true");
  localStorage.removeItem("premium_pending");
}

export function setPremiumPending(): void {
  localStorage.setItem("premium_pending", "true");
}

export function clearPremiumStates(): void {
  localStorage.removeItem("premium_enabled");
  localStorage.removeItem("premium_pending");
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