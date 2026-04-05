'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
} from 'lucide-react';
import Link from 'next/link';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string | null;
  downloadUrl: string | null;
  publishedAt: string | null;
}

interface UpdateStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  message: string;
  timestamp: string | null;
}

interface UpdateStatus {
  active: boolean;
  version: string | null;
  steps: UpdateStep[];
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

const STEP_LABELS: Record<string, string> = {
  downloading: 'Download release',
  extracting: 'Extract archive',
  backing_up: 'Backup current installation',
  copying: 'Copy new files',
  installing: 'Install dependencies',
  building: 'Build project',
  migrating: 'Run database migrations',
  complete: 'Complete',
};

export default function UpdatesPage() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkUpdates = useCallback(async (force = false) => {
    setChecking(true);
    try {
      const res = await apiClient<{ data: UpdateInfo }>(
        `/system/updates${force ? '?force=true' : ''}`,
      );
      setInfo(res.data);
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await apiClient<{ data: UpdateStatus }>('/system/updates/status');
      setStatus(res.data);
      // Stop polling when no longer active
      if (!res.data.active && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        // Refresh update info
        checkUpdates(true);
      }
    } catch {
      // ignore
    }
  }, [checkUpdates]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollStatus();
    pollRef.current = setInterval(pollStatus, 2000);
  }, [pollStatus]);

  useEffect(() => {
    checkUpdates();
    pollStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start polling if update is active
  useEffect(() => {
    if (status?.active) startPolling();
  }, [status?.active, startPolling]);

  const handleApply = async () => {
    setConfirmOpen(false);
    setApplying(true);
    try {
      await apiClient('/system/updates/apply', { method: 'POST' });
      startPolling();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start update');
    } finally {
      setApplying(false);
    }
  };

  const isRunning = status?.active ?? false;
  const hasFailed = status?.error && !status.active;
  const isComplete =
    status?.steps?.every((s) => s.status === 'done') && !status?.active && status?.completedAt;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">System Updates</h1>
          <p className="mt-1 text-muted-foreground">Keep your ForkCart installation up to date</p>
        </div>
        <Link
          href="/settings/updates/history"
          className="ml-auto inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <History className="h-4 w-4" />
          History
        </Link>
      </div>

      {/* Version Info Card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Version Information</h2>
            {info && (
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  Current version: <strong>v{info.currentVersion}</strong>
                </p>
                <p>
                  Latest version:{' '}
                  <strong className={info.updateAvailable ? 'text-yellow-600' : 'text-green-600'}>
                    v{info.latestVersion}
                  </strong>
                </p>
                {info.publishedAt && (
                  <p className="text-muted-foreground">
                    Released: {new Date(info.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => checkUpdates(true)}
              disabled={checking || isRunning}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check for Updates
            </button>
            {info?.updateAvailable && !isRunning && !isComplete && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Update Now
              </button>
            )}
          </div>
        </div>

        {!info?.updateAvailable && info && !isRunning && !isComplete && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            You&apos;re running the latest version!
          </div>
        )}
      </div>

      {/* Release Notes */}
      {info?.releaseNotes && info.updateAvailable && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Release Notes</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {info.releaseNotes}
          </div>
        </div>
      )}

      {/* Update Progress */}
      {(isRunning || hasFailed || isComplete) && status && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {isRunning ? 'Update in Progress...' : hasFailed ? 'Update Failed' : 'Update Complete'}
          </h2>
          <div className="space-y-3">
            {status.steps.map((step) => (
              <div key={step.name} className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {step.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {step.status === 'running' && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                  {step.status === 'pending' && (
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}
                  >
                    {STEP_LABELS[step.name] ?? step.name}
                  </p>
                  {step.message && step.status !== 'pending' && (
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error message */}
          {hasFailed && status.error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Update failed and was automatically rolled back</p>
                <p className="mt-1 text-red-600">{status.error}</p>
              </div>
            </div>
          )}

          {/* Success — restart needed */}
          {isComplete && !hasFailed && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Update complete!</p>
                <p className="mt-1">
                  ForkCart has been updated to <strong>v{status.version}</strong>. The server will
                  restart automatically in a few seconds.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card border shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Confirm Update</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              This will update ForkCart from <strong>v{info?.currentVersion}</strong> to{' '}
              <strong>v{info?.latestVersion}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              The admin panel may be temporarily unavailable during the update. A backup will be
              created automatically.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
