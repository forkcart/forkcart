'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  const check = useCallback(async () => {
    try {
      const res = await apiClient<{ data: UpdateInfo }>('/system/updates');
      setInfo(res.data);
    } catch {
      // Not logged in or API down
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (!info?.updateAvailable || dismissed) return null;

  return (
    <div className="flex items-center justify-between bg-yellow-50 px-4 py-2 text-sm text-yellow-800 border-b border-yellow-200">
      <div className="flex items-center gap-2">
        <span>🚀</span>
        <span>
          ForkCart <strong>v{info.latestVersion}</strong> is available!{' '}
          <span className="text-yellow-600">(current: v{info.currentVersion})</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/settings/updates')}
          className="rounded bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700"
        >
          Update Now →
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
