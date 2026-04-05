'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface UpdateLogEntry {
  version: string;
  fromVersion: string;
  status: 'success' | 'failed' | 'rolled_back';
  startedAt: string;
  completedAt: string;
  error?: string;
}

const STATUS_CONFIG = {
  success: { label: 'Success', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  rolled_back: { label: 'Rolled Back', icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-50' },
};

export default function UpdateHistoryPage() {
  const [log, setLog] = useState<UpdateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await apiClient<{ data: UpdateLogEntry[] }>('/system/updates/history');
        setLog(res.data.reverse()); // newest first
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings/updates" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Update History</h1>
          <p className="mt-1 text-muted-foreground">Previous updates and their results</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : log.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No updates have been performed yet.
          </div>
        ) : (
          <div className="divide-y">
            {log.map((entry, i) => {
              const config = STATUS_CONFIG[entry.status];
              const Icon = config.icon;
              const duration = Math.round(
                (new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000,
              );

              return (
                <div key={i} className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 rounded-full p-1.5 ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        v{entry.fromVersion} → v{entry.version}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {new Date(entry.startedAt).toLocaleString()} · {duration}s
                    </div>
                    {entry.error && (
                      <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                        {entry.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
