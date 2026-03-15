'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import {
  Smartphone,
  Download,
  Rocket,
  Loader2,
  CheckCircle2,
  Code2,
  Zap,
  Copy,
  Palette,
} from 'lucide-react';

interface MobileAppConfig {
  id?: string;
  appName: string;
  appSlug: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  iconMediaId: string | null;
  splashMediaId: string | null;
  apiUrl: string;
  bundleId: string | null;
  androidPackage: string | null;
  buildMode: string;
  lastBuildStatus: string | null;
  lastBuildUrl: string | null;
  lastBuildAt: string | null;
}

const DEFAULT_CONFIG: MobileAppConfig = {
  appName: 'My Store',
  appSlug: 'my-store',
  primaryColor: '#000000',
  accentColor: '#FF6B00',
  backgroundColor: '#FFFFFF',
  iconMediaId: null,
  splashMediaId: null,
  apiUrl:
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : 'http://localhost:4000',
  bundleId: null,
  androidPackage: null,
  buildMode: 'casual',
  lastBuildStatus: null,
  lastBuildUrl: null,
  lastBuildAt: null,
};

export default function MobileAppPage() {
  const [config, setConfig] = useState<MobileAppConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await apiClient<{ data: MobileAppConfig | null }>('/mobile-app/config');
      if (res.data) {
        setConfig(res.data);
        setBuildStatus(res.data.lastBuildStatus);
      }
    } catch {
      // Config doesn't exist yet — use defaults
    }
  }

  const updateField = useCallback(
    <K extends keyof MobileAppConfig>(field: K, value: MobileAppConfig[K]) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
      setSaved(false);
    },
    [],
  );

  async function saveConfig() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient<{ data: MobileAppConfig }>('/mobile-app/config', {
        method: 'PUT',
        body: JSON.stringify({
          appName: config.appName,
          appSlug: config.appSlug,
          primaryColor: config.primaryColor,
          accentColor: config.accentColor,
          backgroundColor: config.backgroundColor,
          apiUrl: config.apiUrl,
          bundleId: config.bundleId || null,
          androidPackage: config.androidPackage || null,
        }),
      });
      setConfig(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      // Save config first
      await saveConfig();

      const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('forkcart_token') : null;

      const res = await fetch(`${API_BASE}/api/v1/mobile-app/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(err.error?.message ?? `Failed to generate: ${res.status}`);
      }

      // Download the ZIP
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'forkcart-mobile.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project');
    } finally {
      setGenerating(false);
    }
  }

  async function handleBuild() {
    setBuilding(true);
    setError(null);
    try {
      await saveConfig();
      const res = await apiClient<{ data: { status: string; message: string } }>(
        '/mobile-app/build',
        { method: 'POST' },
      );
      setBuildStatus(res.data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger build');
    } finally {
      setBuilding(false);
    }
  }

  function copyCommand(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-500/10 to-orange-500/10 px-6 py-2">
          <Smartphone className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-medium text-violet-600">App Builder</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">📱 Mobile App Builder</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Create your store&apos;s mobile app in minutes
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column — Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Config Form */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Palette className="h-5 w-5 text-violet-500" />
              <h2 className="text-lg font-semibold">App Configuration</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appName">App Name</Label>
                <Input
                  id="appName"
                  value={config.appName}
                  onChange={(e) => updateField('appName', e.target.value)}
                  placeholder="My Store"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSlug">App Slug</Label>
                <Input
                  id="appSlug"
                  value={config.appSlug}
                  onChange={(e) =>
                    updateField('appSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                  }
                  placeholder="my-store"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={config.apiUrl}
                  onChange={(e) => updateField('apiUrl', e.target.value)}
                  placeholder="https://api.mystore.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bundleId">iOS Bundle ID (optional)</Label>
                <Input
                  id="bundleId"
                  value={config.bundleId ?? ''}
                  onChange={(e) => updateField('bundleId', e.target.value || null)}
                  placeholder="com.mystore.app"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="androidPackage">Android Package (optional)</Label>
                <Input
                  id="androidPackage"
                  value={config.androidPackage ?? ''}
                  onChange={(e) => updateField('androidPackage', e.target.value || null)}
                  placeholder="com.mystore.app"
                />
              </div>
            </div>

            {/* Color Pickers */}
            <div className="mt-6 grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={config.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border"
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="accentColor"
                    value={config.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border"
                  />
                  <Input
                    value={config.accentColor}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bgColor">Background</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="bgColor"
                    value={config.backgroundColor}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border"
                  />
                  <Input
                    value={config.backgroundColor}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : null}
                {saved ? 'Saved!' : 'Save Configuration'}
              </button>
            </div>
          </div>

          {/* Two Mode Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Quick Build Card */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-50 to-orange-50 p-6 shadow-sm dark:from-violet-950/20 dark:to-orange-950/20">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/10 to-orange-500/10" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  <Zap className="h-3.5 w-3.5" />
                  Quick Build
                </div>
                <h3 className="mb-1 text-lg font-semibold">🎯 Quick Build</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Get your app ready — no coding required
                </p>

                <button
                  onClick={handleBuild}
                  disabled={building}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50"
                >
                  {building ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Rocket className="h-5 w-5" />
                  )}
                  {building ? 'Building...' : '🚀 Build My App'}
                </button>

                {buildStatus && (
                  <div className="mt-4 rounded-lg border bg-white/60 p-3 text-sm dark:bg-white/5">
                    {buildStatus === 'building' && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cloud builds coming soon! For now, download the project and run{' '}
                        <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/30">
                          eas build
                        </code>
                      </div>
                    )}
                    {buildStatus === 'ready' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Build ready!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Developer Mode Card */}
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 to-sky-50 p-6 shadow-sm dark:from-slate-950/20 dark:to-sky-950/20">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-slate-500/10 to-sky-500/10" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Code2 className="h-3.5 w-3.5" />
                  Developer
                </div>
                <h3 className="mb-1 text-lg font-semibold">🔧 Developer Mode</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Download the full Expo project and customize everything
                </p>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {generating ? 'Generating...' : '📦 Download Project (ZIP)'}
                </button>

                {/* Quick Start */}
                <div className="mt-4 rounded-lg border bg-white/60 p-3 dark:bg-white/5">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Quick Start:</p>
                  <div className="space-y-1">
                    {[
                      'unzip forkcart-mobile.zip',
                      'cd forkcart-mobile && npm install',
                      'npx expo start',
                    ].map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => copyCommand(cmd)}
                        className="flex w-full items-center gap-2 rounded bg-slate-100 px-2.5 py-1.5 text-left font-mono text-xs transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="flex-1">{cmd}</span>
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                  {copied && <p className="mt-1.5 text-xs text-green-600">Copied to clipboard!</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Phone Preview */}
        <div className="flex justify-center lg:justify-start">
          <PhonePreview config={config} />
        </div>
      </div>
    </div>
  );
}

/* ─── Phone Preview Component ─────────────────────────────────────────────── */

function PhonePreview({ config }: { config: MobileAppConfig }) {
  return (
    <div className="sticky top-6">
      <p className="mb-3 text-center text-sm font-medium text-muted-foreground">Live Preview</p>
      {/* Phone Frame */}
      <div className="relative mx-auto w-[280px]">
        {/* Outer frame */}
        <div className="rounded-[40px] border-[3px] border-slate-800 bg-slate-800 p-1.5 shadow-2xl dark:border-slate-600">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-800 dark:bg-slate-600" />

          {/* Screen */}
          <div
            className="overflow-hidden rounded-[32px]"
            style={{ backgroundColor: config.backgroundColor }}
          >
            {/* Status Bar */}
            <div
              className="flex items-center justify-between px-6 pb-1 pt-8 text-[10px] font-medium"
              style={{
                color: getContrastColor(config.primaryColor) === '#ffffff' ? '#fff' : '#000',
              }}
            >
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-3.5 rounded-sm border border-current opacity-80" />
              </div>
            </div>

            {/* App Header */}
            <div className="px-4 py-3" style={{ backgroundColor: config.primaryColor }}>
              <div className="flex items-center gap-3">
                {/* App Icon */}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-base shadow-sm"
                  style={{
                    backgroundColor: config.accentColor,
                    color: getContrastColor(config.accentColor),
                  }}
                >
                  🛍️
                </div>
                <div>
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ color: getContrastColor(config.primaryColor) }}
                  >
                    {config.appName || 'My Store'}
                  </p>
                  <p
                    className="text-[10px] opacity-70"
                    style={{ color: getContrastColor(config.primaryColor) }}
                  >
                    Welcome back!
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  backgroundColor:
                    config.backgroundColor === '#FFFFFF'
                      ? '#f1f5f9'
                      : adjustBrightness(config.backgroundColor, 20),
                }}
              >
                <span className="text-xs text-slate-400">🔍 Search products...</span>
              </div>
            </div>

            {/* Featured Banner */}
            <div className="px-4">
              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
                }}
              >
                <p
                  className="text-xs font-bold"
                  style={{ color: getContrastColor(config.primaryColor) }}
                >
                  🔥 New Arrivals
                </p>
                <p
                  className="mt-0.5 text-[10px] opacity-80"
                  style={{ color: getContrastColor(config.primaryColor) }}
                >
                  Check out our latest collection
                </p>
                <div
                  className="mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor: getContrastColor(config.primaryColor),
                    color: config.primaryColor,
                  }}
                >
                  Shop Now →
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="px-4 py-3">
              <p
                className="mb-2 text-xs font-semibold"
                style={{
                  color:
                    config.backgroundColor === '#FFFFFF'
                      ? '#1e293b'
                      : getContrastColor(config.backgroundColor),
                }}
              >
                Popular Products
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-2"
                    style={{
                      borderColor:
                        config.backgroundColor === '#FFFFFF'
                          ? '#e2e8f0'
                          : adjustBrightness(config.backgroundColor, 30),
                    }}
                  >
                    <div
                      className="mb-1.5 h-16 rounded-md"
                      style={{
                        backgroundColor:
                          config.backgroundColor === '#FFFFFF'
                            ? '#f8fafc'
                            : adjustBrightness(config.backgroundColor, 15),
                      }}
                    />
                    <div
                      className="mb-0.5 h-2 w-3/4 rounded"
                      style={{
                        backgroundColor:
                          config.backgroundColor === '#FFFFFF'
                            ? '#cbd5e1'
                            : adjustBrightness(config.backgroundColor, 25),
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: config.accentColor }}>
                        $29.99
                      </span>
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[8px]"
                        style={{
                          backgroundColor: config.accentColor,
                          color: getContrastColor(config.accentColor),
                        }}
                      >
                        +
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Nav */}
            <div
              className="flex items-center justify-around border-t px-2 py-2"
              style={{
                borderColor:
                  config.backgroundColor === '#FFFFFF'
                    ? '#e2e8f0'
                    : adjustBrightness(config.backgroundColor, 30),
                backgroundColor: config.backgroundColor,
              }}
            >
              {['🏠', '🔍', '🛒', '❤️', '👤'].map((icon, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1"
                  style={{
                    color: i === 0 ? config.accentColor : '#94a3b8',
                  }}
                >
                  <span className="text-sm">{icon}</span>
                  <div
                    className="h-0.5 w-3 rounded-full"
                    style={{
                      backgroundColor: i === 0 ? config.accentColor : 'transparent',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-2 pt-1">
              <div className="h-1 w-24 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/** Get a contrasting text color (black or white) for a given background */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

/** Adjust hex color brightness by a given amount (-255 to 255) */
function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
