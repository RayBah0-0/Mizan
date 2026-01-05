function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost')) {
      return 'http://localhost:3002';
    }
    return origin;
  }

  return 'http://localhost:3002';
}

const API_URL = `${resolveApiBase()}/api`;

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

