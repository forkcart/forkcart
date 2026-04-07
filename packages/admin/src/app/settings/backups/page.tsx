'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  Database,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await apiClient<{ data: BackupInfo[] }>('/system/backups');
      setBackups(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    setMessage(null);
    try {
      await apiClient('/system/backups', { method: 'POST' });
      setMessage({ type: 'success', text: 'Backup created successfully!' });
      fetchBackups();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Backup failed' });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `Are you sure you want to restore ${filename}? This will overwrite the current database!`,
      )
    ) {
      return;
    }
    setRestoring(filename);
    setMessage(null);
    try {
      await apiClient(`/system/backups/${filename}/restore`, { method: 'POST' });
      setMessage({
        type: 'success',
        text: `Backup ${filename} restored! Restart the server for full effect.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Restore failed' });
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete backup ${filename}?`)) return;
    try {
      await apiClient(`/system/backups/${filename}`, { method: 'DELETE' });
      fetchBackups();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Database Backups</h1>
          <p className="mt-1 text-muted-foreground">Create and manage database backups</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          Create Backup
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No backups yet. Create your first backup to get started.
          </div>
        ) : (
          <div className="divide-y">
            {backups.map((backup) => (
              <div key={backup.filename} className="flex items-center gap-4 p-4">
                <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{backup.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(backup.size)} · {new Date(backup.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRestore(backup.filename)}
                    disabled={restoring !== null}
                    className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium border transition hover:bg-muted disabled:opacity-50"
                    title="Restore"
                  >
                    {restoring === backup.filename ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                  <button
                    onClick={() => handleDelete(backup.filename)}
                    className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium border text-red-600 transition hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
