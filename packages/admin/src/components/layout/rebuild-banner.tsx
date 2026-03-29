'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface RebuildStatus {
  rebuildNeeded: boolean;
  reason?: string;
  timestamp?: string;
}

export function RebuildBanner() {
  const [status, setStatus] = useState<RebuildStatus | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await apiClient<{ data: RebuildStatus }>('/system/rebuild');
      setStatus(res.data);
    } catch {
      // Not logged in or API down — ignore
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await apiClient('/system/rebuild', { method: 'POST' });
      // Clear the banner immediately — rebuild is running in background
      setStatus({ rebuildNeeded: false });
    } catch (err) {
      console.error('Rebuild trigger failed:', err);
      setRebuilding(false);
    }
  };

  if (!status?.rebuildNeeded) return null;

  return (
    <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-sm text-amber-800 border-b border-amber-200">
      <div className="flex items-center gap-2">
        <span className="text-amber-500">⚠️</span>
        <span>
          Plugin changes detected{status.reason ? `: ${status.reason}` : ''}. A rebuild is required
          for changes to take effect.
        </span>
      </div>
      <button
        onClick={handleRebuild}
        disabled={rebuilding}
        className="ml-4 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {rebuilding ? 'Rebuilding…' : 'Rebuild Now'}
      </button>
    </div>
  );
}
