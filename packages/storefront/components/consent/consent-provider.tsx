'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { API_URL } from '@/lib/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsentState {
  [key: string]: boolean;
}

export interface ConsentCategory {
  id: string;
  key: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface ConsentConfig {
  categories: ConsentCategory[];
  settings: Record<string, string>;
}

interface ConsentContextValue {
  /** Current consent state (e.g. { necessary: true, analytics: false }) */
  consent: ConsentState;
  /** Whether the consent banner should be shown */
  showBanner: boolean;
  /** Whether the settings modal is open */
  showSettings: boolean;
  /** Loaded categories from the API */
  categories: ConsentCategory[];
  /** Loaded text settings from the API */
  settings: Record<string, string>;
  /** Accept all categories */
  acceptAll: () => void;
  /** Reject all optional categories (keep required) */
  rejectAll: () => void;
  /** Save specific choices */
  saveChoices: (choices: ConsentState) => void;
  /** Open settings modal */
  openSettings: () => void;
  /** Close settings modal */
  closeSettings: () => void;
  /** Check if a specific category is consented */
  hasConsent: (category: string) => boolean;
}

export const ConsentContext = createContext<ConsentContextValue | null>(null);

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME = 'forkcart_consent';
const COOKIE_DAYS = 365;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function parseConsent(): ConsentState | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchConsentConfig(locale?: string): Promise<ConsentConfig> {
  try {
    const url = locale
      ? `${API_URL}/api/v1/public/cookie-consent/config?locale=${locale}`
      : `${API_URL}/api/v1/public/cookie-consent/config`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch consent config');
    const json = (await res.json()) as { data: ConsentConfig };
    return json.data;
  } catch {
    // Fallback: empty settings → banner/modal will use i18n translations
    return {
      categories: [
        {
          id: '1',
          key: 'necessary',
          label: 'Necessary',
          description: 'Session, cart, security',
          required: true,
          enabled: true,
          sortOrder: 0,
        },
        {
          id: '2',
          key: 'functional',
          label: 'Functional',
          description: 'Language, theme',
          required: false,
          enabled: true,
          sortOrder: 1,
        },
        {
          id: '3',
          key: 'analytics',
          label: 'Analytics',
          description: 'Analytics & tracking',
          required: false,
          enabled: true,
          sortOrder: 2,
        },
        {
          id: '4',
          key: 'marketing',
          label: 'Marketing',
          description: 'Advertising & retargeting',
          required: false,
          enabled: true,
          sortOrder: 3,
        },
      ],
      settings: {},
    };
  }
}

async function logConsent(consent: ConsentState) {
  try {
    await fetch(`${API_URL}/api/v1/public/cookie-consent/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent }),
    });
  } catch {
    // Logging failure is non-critical
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConsentProvider({ children, locale }: { children: ReactNode; locale?: string }) {
  const [consent, setConsent] = useState<ConsentState>({});
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [categories, setCategories] = useState<ConsentCategory[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Load config + existing consent on mount
  useEffect(() => {
    async function init() {
      const config = await fetchConsentConfig(locale);
      setCategories(config.categories);
      setSettings(config.settings);

      const existing = parseConsent();
      if (existing) {
        // Ensure required categories are always true
        const merged = { ...existing };
        for (const cat of config.categories) {
          if (cat.required) merged[cat.key] = true;
        }
        setConsent(merged);
        setShowBanner(false);
      } else {
        // No consent yet — build default state (only required = true)
        const defaults: ConsentState = {};
        for (const cat of config.categories) {
          defaults[cat.key] = cat.required;
        }
        setConsent(defaults);
        setShowBanner(true);
      }
    }
    init();
  }, [locale]);

  const persistConsent = useCallback((state: ConsentState) => {
    setCookie(COOKIE_NAME, JSON.stringify(state), COOKIE_DAYS);
    setConsent(state);
    setShowBanner(false);
    setShowSettings(false);

    // Log for GDPR proof
    logConsent(state);

    // Dispatch event for scripts that need to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('forkcart:consent', { detail: state }));
    }
  }, []);

  const acceptAll = useCallback(() => {
    const state: ConsentState = {};
    for (const cat of categories) {
      state[cat.key] = true;
    }
    persistConsent(state);
  }, [categories, persistConsent]);

  const rejectAll = useCallback(() => {
    const state: ConsentState = {};
    for (const cat of categories) {
      state[cat.key] = cat.required;
    }
    persistConsent(state);
  }, [categories, persistConsent]);

  const saveChoices = useCallback(
    (choices: ConsentState) => {
      // Ensure required categories can't be turned off
      const state = { ...choices };
      for (const cat of categories) {
        if (cat.required) state[cat.key] = true;
      }
      persistConsent(state);
    },
    [categories, persistConsent],
  );

  const hasConsent = useCallback((category: string) => consent[category] === true, [consent]);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      showBanner,
      showSettings,
      categories,
      settings,
      acceptAll,
      rejectAll,
      saveChoices,
      openSettings,
      closeSettings,
      hasConsent,
    }),
    [
      consent,
      showBanner,
      showSettings,
      categories,
      settings,
      acceptAll,
      rejectAll,
      saveChoices,
      openSettings,
      closeSettings,
      hasConsent,
    ],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/** Hook to access consent state */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used within <ConsentProvider>');
  }
  return ctx;
}
