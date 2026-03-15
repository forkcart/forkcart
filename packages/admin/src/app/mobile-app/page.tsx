'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import {
  Smartphone,
  Download,
  Loader2,
  CheckCircle2,
  Code2,
  Copy,
  Palette,
  Package,
  Settings2,
  Sparkles,
  Apple,
  MonitorSmartphone,
  RotateCcw,
  ImageIcon,
  CloudUpload,
  Zap,
  Shield,
} from 'lucide-react';
import { getToken } from '@/lib/auth';

/* ─── Types ───────────────────────────────────────────────────────────────── */

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

type BuildStep = 'idle' | 'saving' | 'generating' | 'packaging' | 'done' | 'error';
type NativeBuildStep =
  | 'idle'
  | 'saving'
  | 'generating'
  | 'compiling'
  | 'signing'
  | 'done'
  | 'error';
type Platform = 'android' | 'ios' | 'pwa';

const SOURCE_BUILD_STEPS: { key: BuildStep; label: string; icon: typeof Settings2 }[] = [
  { key: 'saving', label: 'Saving configuration', icon: Settings2 },
  { key: 'generating', label: 'Generating project', icon: Code2 },
  { key: 'packaging', label: 'Packaging source code', icon: Package },
  { key: 'done', label: 'Ready to download', icon: CheckCircle2 },
];

const NATIVE_BUILD_STEPS: { key: NativeBuildStep; label: string; icon: typeof Settings2 }[] = [
  { key: 'saving', label: 'Saving configuration', icon: Settings2 },
  { key: 'generating', label: 'Generating project files', icon: Code2 },
  { key: 'compiling', label: 'Compiling native app', icon: Package },
  { key: 'signing', label: 'Signing & packaging', icon: Shield },
  { key: 'done', label: 'Ready to download', icon: CheckCircle2 },
];

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function MobileAppPage() {
  const [config, setConfig] = useState<MobileAppConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Source build flow
  const [buildStep, setBuildStep] = useState<BuildStep>('idle');
  const [buildError, setBuildError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Native build flow
  const [nativeBuildStep, setNativeBuildStep] = useState<NativeBuildStep>('idle');
  const [nativeBuildError, setNativeBuildError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('android');
  const nativeBlobUrlRef = useRef<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'config' | 'build' | 'developer'>('config');

  useEffect(() => {
    loadConfig();
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (nativeBlobUrlRef.current) URL.revokeObjectURL(nativeBlobUrlRef.current);
    };
  }, []);

  async function loadConfig() {
    try {
      const res = await apiClient<{ data: MobileAppConfig | null }>('/mobile-app/config');
      if (res.data) setConfig(res.data);
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }

  /* ─── Source Code Build (Developer) ─── */

  async function handleSourceBuild() {
    setBuildError(null);
    try {
      setBuildStep('saving');
      const ok = await saveConfig();
      if (!ok) {
        setBuildStep('error');
        setBuildError('Failed to save configuration');
        return;
      }
      setBuildStep('generating');
      await new Promise((r) => setTimeout(r, 400));
      setBuildStep('packaging');

      const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/v1/mobile-app/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `Build failed: ${res.status}`);
      }
      const blob = await res.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = URL.createObjectURL(blob);
      await apiClient('/mobile-app/build', { method: 'POST' }).catch(() => {});
      setBuildStep('done');
    } catch (err) {
      setBuildStep('error');
      setBuildError(err instanceof Error ? err.message : 'Build failed');
    }
  }

  function handleSourceDownload() {
    if (!blobUrlRef.current) return;
    const a = document.createElement('a');
    a.href = blobUrlRef.current;
    a.download = `${config.appSlug || 'forkcart-mobile'}-source.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ─── Native Build (Easy Mode) ─── */

  async function handleNativeBuild() {
    setNativeBuildError(null);
    try {
      setNativeBuildStep('saving');
      const ok = await saveConfig();
      if (!ok) {
        setNativeBuildStep('error');
        setNativeBuildError('Failed to save configuration');
        return;
      }

      setNativeBuildStep('generating');
      await new Promise((r) => setTimeout(r, 600));

      setNativeBuildStep('compiling');

      const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/v1/mobile-app/build-native`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ platform: selectedPlatform }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `Build failed: ${res.status}`);
      }

      setNativeBuildStep('signing');
      const blob = await res.blob();
      if (nativeBlobUrlRef.current) URL.revokeObjectURL(nativeBlobUrlRef.current);
      nativeBlobUrlRef.current = URL.createObjectURL(blob);

      setNativeBuildStep('done');
    } catch (err) {
      setNativeBuildStep('error');
      setNativeBuildError(err instanceof Error ? err.message : 'Build failed');
    }
  }

  function handleNativeDownload() {
    if (!nativeBlobUrlRef.current) return;
    const ext = selectedPlatform === 'ios' ? 'ipa' : 'apk';
    const a = document.createElement('a');
    a.href = nativeBlobUrlRef.current;
    a.download = `${config.appSlug || 'forkcart-mobile'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function resetNativeBuild() {
    setNativeBuildStep('idle');
    setNativeBuildError(null);
    if (nativeBlobUrlRef.current) {
      URL.revokeObjectURL(nativeBlobUrlRef.current);
      nativeBlobUrlRef.current = null;
    }
  }

  function copyCommand(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 text-white shadow-lg">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mobile App</h1>
            <p className="text-sm text-muted-foreground">
              Build a native mobile app for your store
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {[
          { key: 'config' as const, label: 'Configure', icon: Palette },
          { key: 'build' as const, label: 'Build App', icon: Sparkles },
          { key: 'developer' as const, label: 'Source Code', icon: Code2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* ─── Configure Tab ─────────────────────────── */}
          {activeTab === 'config' && (
            <>
              {/* Basic Info */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">General</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="appName">App Name</Label>
                    <Input
                      id="appName"
                      value={config.appName}
                      onChange={(e) => updateField('appName', e.target.value)}
                      placeholder="My Store"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="appSlug">Slug</Label>
                    <Input
                      id="appSlug"
                      value={config.appSlug}
                      onChange={(e) =>
                        updateField(
                          'appSlug',
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        )
                      }
                      placeholder="my-store"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="apiUrl">API URL</Label>
                    <Input
                      id="apiUrl"
                      value={config.apiUrl}
                      onChange={(e) => updateField('apiUrl', e.target.value)}
                      placeholder="https://api.mystore.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your ForkCart API endpoint. The app connects here for products, orders, etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">Branding</h2>
                <div className="grid grid-cols-3 gap-5">
                  {(
                    [
                      { id: 'primaryColor', label: 'Primary', field: 'primaryColor' as const },
                      { id: 'accentColor', label: 'Accent', field: 'accentColor' as const },
                      { id: 'bgColor', label: 'Background', field: 'backgroundColor' as const },
                    ] as const
                  ).map(({ id, label, field }) => (
                    <div key={id} className="space-y-1.5">
                      <Label htmlFor={id}>{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id={id}
                          value={config[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                        />
                        <Input
                          value={config[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="w-full font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Icon & Splash */}
                <div className="mt-5 grid grid-cols-2 gap-5">
                  {[
                    { label: 'App Icon', size: '1024×1024 PNG' },
                    { label: 'Splash Screen', size: '1284×2778 PNG' },
                  ].map(({ label, size }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center"
                    >
                      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground/60">{label}</p>
                      <p className="text-xs text-muted-foreground/40">{size}</p>
                      <button className="mt-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80">
                        Upload
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform IDs */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-1 text-base font-semibold">Platform Settings</h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  Optional — needed for App Store / Play Store submissions
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="bundleId" className="flex items-center gap-1.5">
                      <Apple className="h-3.5 w-3.5" /> iOS Bundle ID
                    </Label>
                    <Input
                      id="bundleId"
                      value={config.bundleId ?? ''}
                      onChange={(e) => updateField('bundleId', e.target.value || null)}
                      placeholder="com.mystore.app"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="androidPackage" className="flex items-center gap-1.5">
                      <MonitorSmartphone className="h-3.5 w-3.5" /> Android Package
                    </Label>
                    <Input
                      id="androidPackage"
                      value={config.androidPackage ?? ''}
                      onChange={(e) => updateField('androidPackage', e.target.value || null)}
                      placeholder="com.mystore.app"
                    />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Changes are saved before each build automatically
                </p>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : null}
                  {saved ? 'Saved!' : 'Save'}
                </button>
              </div>
            </>
          )}

          {/* ─── Build App Tab (Easy Mode) ─────────────── */}
          {activeTab === 'build' && (
            <div className="space-y-6">
              {/* Platform Selector */}
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="border-b bg-gradient-to-r from-violet-500/5 to-orange-500/5 p-6">
                  <h2 className="text-lg font-semibold">Build Your App</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a platform and get a ready-to-install app file. No coding required.
                  </p>
                </div>

                <div className="p-6">
                  {/* Platform Cards */}
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        {
                          key: 'android' as Platform,
                          icon: '🤖',
                          label: 'Android',
                          desc: 'APK file — install directly or upload to Play Store',
                          available: true,
                        },
                        {
                          key: 'ios' as Platform,
                          icon: '🍎',
                          label: 'iOS',
                          desc: 'IPA file — requires Apple Developer account',
                          available: false,
                        },
                        {
                          key: 'pwa' as Platform,
                          icon: '🌐',
                          label: 'PWA',
                          desc: 'Progressive Web App — works on any device',
                          available: false,
                        },
                      ] as const
                    ).map(({ key, icon, label, desc, available }) => (
                      <button
                        key={key}
                        onClick={() => available && setSelectedPlatform(key)}
                        disabled={!available}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                          selectedPlatform === key && available
                            ? 'border-violet-500 bg-violet-50/50 shadow-sm dark:bg-violet-950/20'
                            : available
                              ? 'border-border hover:border-violet-300 hover:bg-muted/30'
                              : 'cursor-not-allowed border-border opacity-50'
                        }`}
                      >
                        {!available && (
                          <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Coming Soon
                          </span>
                        )}
                        <span className="text-2xl">{icon}</span>
                        <p className="mt-2 text-sm font-semibold">{label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Build Steps */}
                  {nativeBuildStep !== 'idle' && (
                    <div className="mb-6 space-y-3">
                      {NATIVE_BUILD_STEPS.map(({ key, label, icon: StepIcon }) => {
                        const stepIdx = NATIVE_BUILD_STEPS.findIndex(
                          (s) => s.key === nativeBuildStep,
                        );
                        const currentIdx = NATIVE_BUILD_STEPS.findIndex((s) => s.key === key);
                        const isActive = nativeBuildStep === key;
                        const isComplete = nativeBuildStep === 'done' || stepIdx > currentIdx;

                        return (
                          <div key={key} className="flex items-center gap-4">
                            <div
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                                isActive
                                  ? 'bg-violet-100 text-violet-600 ring-4 ring-violet-100/50 dark:bg-violet-900/30 dark:text-violet-400 dark:ring-violet-900/30'
                                  : isComplete
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-muted text-muted-foreground/40'
                              }`}
                            >
                              {isActive && nativeBuildStep !== 'done' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isComplete ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <StepIcon className="h-4 w-4" />
                              )}
                            </div>
                            <p
                              className={`text-sm font-medium ${
                                isActive
                                  ? 'text-foreground'
                                  : isComplete
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-muted-foreground/50'
                              }`}
                            >
                              {label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Error */}
                  {nativeBuildStep === 'error' && nativeBuildError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                      {nativeBuildError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {nativeBuildStep === 'idle' || nativeBuildStep === 'error' ? (
                      <button
                        onClick={handleNativeBuild}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
                      >
                        <Sparkles className="h-5 w-5" />
                        Build{' '}
                        {selectedPlatform === 'android'
                          ? 'APK'
                          : selectedPlatform === 'ios'
                            ? 'IPA'
                            : 'PWA'}
                      </button>
                    ) : nativeBuildStep === 'done' ? (
                      <>
                        <button
                          onClick={handleNativeDownload}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
                        >
                          <Download className="h-5 w-5" />
                          Download{' '}
                          {selectedPlatform === 'android'
                            ? 'APK'
                            : selectedPlatform === 'ios'
                              ? 'IPA'
                              : 'PWA'}
                        </button>
                        <button
                          onClick={resetNativeBuild}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted px-6 py-3 text-sm font-medium text-muted-foreground"
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Building — this may take a few minutes...
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Success: What's in your build */}
              {nativeBuildStep === 'done' && (
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold">
                    ✅ Your {selectedPlatform === 'android' ? 'APK' : 'app'} is ready!
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: '🏠', label: 'Home Screen' },
                        { icon: '🔍', label: 'Product Search' },
                        { icon: '🛒', label: 'Shopping Cart' },
                        { icon: '💳', label: 'Checkout' },
                        { icon: '👤', label: 'User Account' },
                        { icon: '❤️', label: 'Wishlist' },
                        { icon: '⭐', label: 'Reviews' },
                        { icon: '🎨', label: 'Your Branding' },
                      ].map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-sm">
                          <span>{icon}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    {selectedPlatform === 'android' && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="mb-2 text-sm font-semibold">How to install</h4>
                        <ol className="space-y-1.5 text-sm text-muted-foreground">
                          <li>
                            1. Transfer the APK to your Android phone (email, Drive, USB, etc.)
                          </li>
                          <li>
                            2. Open the APK on your phone and tap <strong>Install</strong>
                          </li>
                          <li>3. If prompted, allow installing from unknown sources</li>
                          <li>4. Open the app and start selling! 🎉</li>
                        </ol>
                      </div>
                    )}

                    <div className="rounded-lg border bg-gradient-to-r from-violet-50 to-orange-50 p-4 dark:from-violet-950/20 dark:to-orange-950/20">
                      <h4 className="mb-1 text-sm font-semibold">Ready for Google Play Store?</h4>
                      <p className="text-xs text-muted-foreground">
                        The APK can be uploaded directly to the Google Play Console. Make sure you
                        have set your Android Package name in the Configure tab first.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info: What this does */}
              {nativeBuildStep === 'idle' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: Zap,
                      title: 'One-Click Build',
                      desc: 'No development tools needed. We compile the app for you on our servers.',
                    },
                    {
                      icon: Shield,
                      title: 'Signed & Ready',
                      desc: 'The app is signed and ready to install on devices or submit to app stores.',
                    },
                    {
                      icon: CloudUpload,
                      title: 'Store-Ready',
                      desc: 'Upload directly to Google Play Store or Apple App Store.',
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="rounded-xl border bg-card p-4 shadow-sm">
                      <Icon className="mb-2 h-5 w-5 text-violet-500" />
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Source Code Tab (Developer) ────────────── */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              {/* Download Source */}
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="border-b bg-slate-50 p-6 dark:bg-slate-900/30">
                  <div className="flex items-center gap-3">
                    <Code2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <div>
                      <h2 className="text-lg font-semibold">Source Code</h2>
                      <p className="text-sm text-muted-foreground">
                        Download the full Expo project. Customize anything — components, screens,
                        API integration, navigation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Source build steps */}
                  {buildStep !== 'idle' && buildStep !== 'done' && buildStep !== 'error' && (
                    <div className="mb-6 space-y-3">
                      {SOURCE_BUILD_STEPS.map(({ key, label, icon: StepIcon }) => {
                        const stepIdx = SOURCE_BUILD_STEPS.findIndex((s) => s.key === buildStep);
                        const currentIdx = SOURCE_BUILD_STEPS.findIndex((s) => s.key === key);
                        const isActive = buildStep === key;
                        const isComplete = stepIdx > currentIdx;

                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                                isActive
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  : isComplete
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                    : 'bg-muted text-muted-foreground/40'
                              }`}
                            >
                              {isActive ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isComplete ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <StepIcon className="h-4 w-4" />
                              )}
                            </div>
                            <span className="text-sm">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {buildStep === 'error' && buildError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                      {buildError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {buildStep === 'idle' || buildStep === 'error' ? (
                      <button
                        onClick={handleSourceBuild}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        <Download className="h-4 w-4" />
                        Generate &amp; Download ZIP
                      </button>
                    ) : buildStep === 'done' ? (
                      <>
                        <button
                          onClick={handleSourceDownload}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                        >
                          <Download className="h-4 w-4" />
                          Download Source ZIP
                        </button>
                        <button
                          onClick={() => {
                            setBuildStep('idle');
                            setBuildError(null);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 rounded-lg bg-muted px-5 py-2.5 text-sm font-medium text-muted-foreground"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">Quick Start</h2>
                <div className="space-y-2">
                  {[
                    {
                      cmd: `unzip ${config.appSlug || 'forkcart-mobile'}-source.zip && cd forkcart-mobile`,
                      label: 'Extract',
                    },
                    { cmd: 'npm install', label: 'Install' },
                    { cmd: 'npx expo start', label: 'Start Dev Server' },
                    { cmd: 'npx expo start --tunnel', label: 'Remote Access' },
                    {
                      cmd: 'eas build --platform android --profile preview',
                      label: 'Build APK',
                    },
                    {
                      cmd: 'eas build --platform ios --profile preview',
                      label: 'Build IPA',
                    },
                  ].map(({ cmd, label }) => (
                    <div key={cmd} className="flex items-center gap-3">
                      <button
                        onClick={() => copyCommand(cmd)}
                        className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-left font-mono text-xs transition-colors hover:bg-muted"
                      >
                        <span className="flex-1">{cmd}</span>
                        <Copy className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      </button>
                      <span className="w-32 text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                  {copied && (
                    <p className="text-xs font-medium text-green-600">Copied to clipboard!</p>
                  )}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">Tech Stack</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    { name: 'Expo SDK 52', desc: 'React Native framework' },
                    { name: 'Expo Router', desc: 'File-based routing' },
                    { name: 'TypeScript', desc: 'Type-safe code' },
                    { name: 'SecureStore', desc: 'Token persistence' },
                    { name: 'Context API', desc: 'State management' },
                    { name: 'StyleSheet', desc: 'No external UI libs' },
                  ].map(({ name, desc }) => (
                    <div key={name} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Structure */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">Project Structure</h2>
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-300">
                  {`forkcart-mobile/
├── app/
│   ├── (tabs)/          # Tab navigation
│   │   ├── index.tsx    # Home screen
│   │   ├── search.tsx   # Search
│   │   ├── cart.tsx     # Shopping cart
│   │   └── account.tsx  # User account
│   ├── product/[slug]   # Product detail
│   ├── category/[id]    # Category listing
│   ├── checkout.tsx     # Checkout flow
│   ├── orders/          # Order history
│   ├── login.tsx        # Login
│   └── register.tsx     # Registration
├── components/          # Reusable components
├── lib/
│   ├── api.ts           # API client
│   ├── auth.ts          # Auth context
│   ├── cart.ts          # Cart context
│   └── config.ts        # App config
├── theme/               # Design tokens
├── app.json             # ← Your config
└── theme.config.ts      # ← Generated from your settings`}
                </pre>
              </div>
            </div>
          )}
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
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Live Preview
      </p>
      <div className="relative mx-auto w-[280px]">
        <div className="rounded-[40px] border-[3px] border-slate-800 bg-slate-800 p-1.5 shadow-2xl dark:border-slate-600">
          <div className="absolute left-1/2 top-0 z-10 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-800 dark:bg-slate-600" />
          <div
            className="overflow-hidden rounded-[32px]"
            style={{ backgroundColor: config.backgroundColor }}
          >
            {/* Status Bar */}
            <div className="flex items-center justify-between px-6 pb-1 pt-8 text-[10px] font-medium text-slate-500">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-3.5 rounded-sm border border-current opacity-60" />
              </div>
            </div>

            {/* App Header */}
            <div className="px-4 py-3" style={{ backgroundColor: config.primaryColor }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm shadow-sm"
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
                    className="text-[10px] opacity-60"
                    style={{ color: getContrastColor(config.primaryColor) }}
                  >
                    Welcome back!
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-2.5">
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{
                  backgroundColor:
                    config.backgroundColor === '#FFFFFF'
                      ? '#f1f5f9'
                      : adjustBrightness(config.backgroundColor, 20),
                }}
              >
                <span className="text-[10px] text-slate-400">🔍 Search products...</span>
              </div>
            </div>

            {/* Featured Banner */}
            <div className="px-4">
              <div
                className="rounded-lg p-3"
                style={{
                  background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
                }}
              >
                <p
                  className="text-[10px] font-bold"
                  style={{ color: getContrastColor(config.primaryColor) }}
                >
                  🔥 New Arrivals
                </p>
                <p
                  className="mt-0.5 text-[8px] opacity-70"
                  style={{ color: getContrastColor(config.primaryColor) }}
                >
                  Check out our latest collection
                </p>
                <div
                  className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[8px] font-semibold"
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
            <div className="px-4 py-2.5">
              <p
                className="mb-1.5 text-[10px] font-semibold"
                style={{
                  color:
                    config.backgroundColor === '#FFFFFF'
                      ? '#1e293b'
                      : getContrastColor(config.backgroundColor),
                }}
              >
                Popular Products
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-md border p-1.5"
                    style={{
                      borderColor:
                        config.backgroundColor === '#FFFFFF'
                          ? '#e2e8f0'
                          : adjustBrightness(config.backgroundColor, 30),
                    }}
                  >
                    <div
                      className="mb-1 h-14 rounded"
                      style={{
                        backgroundColor:
                          config.backgroundColor === '#FFFFFF'
                            ? '#f8fafc'
                            : adjustBrightness(config.backgroundColor, 15),
                      }}
                    />
                    <div
                      className="mb-0.5 h-1.5 w-3/4 rounded"
                      style={{
                        backgroundColor:
                          config.backgroundColor === '#FFFFFF'
                            ? '#cbd5e1'
                            : adjustBrightness(config.backgroundColor, 25),
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold" style={{ color: config.accentColor }}>
                        $29.99
                      </span>
                      <div
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[7px]"
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
              className="flex items-center justify-around border-t px-2 py-1.5"
              style={{
                borderColor:
                  config.backgroundColor === '#FFFFFF'
                    ? '#e2e8f0'
                    : adjustBrightness(config.backgroundColor, 30),
              }}
            >
              {['🏠', '🔍', '🛒', '❤️', '👤'].map((icon, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 px-2 py-0.5">
                  <span className="text-xs">{icon}</span>
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
            <div className="flex justify-center pb-1.5 pt-0.5">
              <div className="h-1 w-20 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
