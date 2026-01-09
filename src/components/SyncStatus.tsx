import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

export default function SyncStatus() {
  const { user } = useClerkAuth();
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const updateLastSync = () => {
      const syncTime = localStorage.getItem('mizan_v1_last_sync');
      setLastSync(syncTime);
    };

    updateLastSync();
    const interval = setInterval(updateLastSync, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-[#4a4a4d] text-xs tracking-wide">
        <CloudOff className="w-3 h-3" />
        <span>Offline mode</span>
      </div>
    );
  }

  const getTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Not synced';
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex items-center gap-2 text-[#5a5a5d] text-xs tracking-wide">
      <Cloud className="w-3 h-3" />
      <span>{getTimeAgo(lastSync)}</span>
    </div>
  );
}
