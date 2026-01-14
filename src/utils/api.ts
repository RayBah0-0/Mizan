const FALLBACK_REMOTE_API = 'https://mizan1.onrender.com';

export function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // If deployed (not localhost), use same origin for API
    if (!origin.includes('localhost')) {
      return origin.replace(/\/$/, '');
    }

    // For local development, check for override or use deployed API
    const override = window.localStorage?.getItem('mizan_api_url');
    if (override) return override.replace(/\/$/, '');
    return FALLBACK_REMOTE_API;
  }

  return FALLBACK_REMOTE_API;
}

export const API_URL = `${resolveApiBase()}/api`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = localStorage.getItem('mizan_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

export async function syncData() {
  const response = await fetch(`${API_URL}/data/sync`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to sync data');
  }

  return response.json();
}

export async function saveCheckin(date: string, categories: any, penalties: number, completed: boolean) {
  const response = await fetch(`${API_URL}/data/checkins`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ date, categories, penalties, completed })
  });

  if (!response.ok) {
    throw new Error('Failed to save checkin');
  }

  return response.json();
}

export async function saveCycle(cycleNumber: number, days: any[], completed: boolean) {
  const response = await fetch(`${API_URL}/data/cycles`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ cycleNumber, days, completed })
  });

  if (!response.ok) {
    throw new Error('Failed to save cycle');
  }

  return response.json();
}

export async function saveSettings(settings: any) {
  const response = await fetch(`${API_URL}/data/settings`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ settings })
  });

  if (!response.ok) {
    throw new Error('Failed to save settings');
  }

  return response.json();
}

export async function setAccessCode(accessCode: string) {
  const response = await fetch(`${API_URL}/auth/set-access-code`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ accessCode })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set access code');
  }

  return response.json();
}

export async function getUserInfo() {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

export async function getMizanSession() {
  const response = await fetch(`${API_URL}/data/me`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to load session');
  }

  return response.json();
}

export async function getSummary(range: string = '14d') {
  const response = await fetch(`${API_URL}/data/summary?range=${encodeURIComponent(range)}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to load summary');
  }

  return response.json();
}

export async function acceptPledge() {
  const response = await fetch(`${API_URL}/data/pledge/accept`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to accept pledge');
  }

  return response.json();
}

export async function getLoss() {
  const response = await fetch(`${API_URL}/data/loss`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to load loss');
  }

  return response.json();
}

export async function updateSubscription(data: { tier: string; subscriptionEndsAt?: string | null }) {
  const response = await fetch(`${API_URL}/auth/update-subscription`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }

  return response.json();
}

export async function createPremiumToken() {
  const response = await fetch(`${API_URL}/auth/premium/create-token`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to create premium activation link');
  }

  return response.json();
}

export async function createPremiumTokenFromStripe(stripeSessionId: string) {
  const response = await fetch(`${API_URL}/auth/premium/create-from-stripe`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ stripeSessionId })
  });

  if (!response.ok) {
    throw new Error('Failed to create activation token from Stripe session');
  }

  return response.json();
}

export async function getOrCreateClerkToken(clerkId: string, email: string, username?: string) {
  const response = await fetch(`${API_URL}/auth/clerk-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clerkId, email, username })
  });

  if (!response.ok) {
    throw new Error('Failed to get Clerk token');
  }

  return response.json();
}

export async function redeemPremiumToken(token: string) {
  const response = await fetch(`${API_URL}/auth/premium/redeem`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to redeem premium');
  }

  return response.json();
}

// ===== MOD API =====

export async function checkModStatus() {
  const response = await fetch(`${API_URL}/mod/check-status`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to check mod status');
  }

  return response.json();
}

export async function getModUsers(page: number = 1, limit: number = 50, search: string = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });

  const response = await fetch(`${API_URL}/mod/users/list?${params}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get users list');
  }

  return response.json();
}

export async function getModUserDetails(userId: number) {
  const response = await fetch(`${API_URL}/mod/users/${userId}/details`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get user details');
  }

  return response.json();
}

export async function getModUserActivity(userId: number, limit: number = 30) {
  const response = await fetch(`${API_URL}/mod/users/${userId}/activity?limit=${limit}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get user activity');
  }

  return response.json();
}

export async function grantPremium(userId: number, reason: string, durationDays: number = 365) {
  const response = await fetch(`${API_URL}/mod/users/${userId}/grant-premium`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ reason, duration_days: durationDays })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to grant premium');
  }

  return response.json();
}

export async function revokePremium(userId: number, reason: string) {
  const response = await fetch(`${API_URL}/mod/users/${userId}/revoke-premium`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke premium');
  }

  return response.json();
}

export async function getModUserPremiumHistory(userId: number) {
  const response = await fetch(`${API_URL}/mod/users/${userId}/premium-history`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get premium history');
  }

  return response.json();
}

export async function getModAuditLogs(page: number = 1, limit: number = 50, actionType?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(actionType && { action_type: actionType })
  });

  const response = await fetch(`${API_URL}/mod/audit/logs?${params}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get audit logs');
  }

  return response.json();
}


