export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
}

export function checkNotificationPermission(): 'default' | 'granted' | 'denied' {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as 'default' | 'granted' | 'denied';
}

// Store notification preference
export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem('mizan_notifications_enabled', enabled.toString());
}

export function getNotificationsEnabled(): boolean {
  const stored = localStorage.getItem('mizan_notifications_enabled');
  return stored === 'true';
}

// Check if user has completed today's check-in
export function shouldShowCheckInReminder(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return true;
  
  const lastDate = new Date(lastCheckIn);
  const today = new Date();
  
  return lastDate.toDateString() !== today.toDateString();
}
