'use client';

import { Component, lazy, Suspense, useRef, type ReactNode, type ErrorInfo } from 'react';
import { API_URL } from '@/lib/config';

// ─── Module cache (avoid re-importing the same bundle) ───────────────────────
// Cache key includes the bundle hash so updated plugins get a fresh import.

const moduleCache = new Map<string, Promise<Record<string, unknown>>>();

/**
 * Dynamically import a plugin's ESM component bundle.
 * Appends `?v=<bundleHash>` when a hash is provided to bust browser caches.
 * The cache key is `slug@hash` so stale entries are never re-used.
 */
function getPluginModule(
  pluginSlug: string,
  bundleHash?: string | null,
): Promise<Record<string, unknown>> {
  const cacheKey = bundleHash ? `${pluginSlug}@${bundleHash}` : pluginSlug;
  const cached = moduleCache.get(cacheKey);
  if (cached) return cached;

  const baseUrl = `${API_URL}/api/v1/public/plugins/${encodeURIComponent(pluginSlug)}/components.js`;
  const url = bundleHash ? `${baseUrl}?v=${bundleHash}` : baseUrl;
  const promise = import(/* webpackIgnore: true */ url).then(
    (mod) => mod as Record<string, unknown>,
  );

  moduleCache.set(cacheKey, promise);

  // On failure, remove from cache so it can be retried
  promise.catch(() => {
    moduleCache.delete(cacheKey);
  });

  return promise;
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  pluginSlug: string;
  componentName: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PluginErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[PluginComponent] Error in ${this.props.pluginSlug}/${this.props.componentName}:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — plugin errors must not break the page
      return null;
    }
    return this.props.children;
  }
}

// ─── PluginComponent ─────────────────────────────────────────────────────────

export interface PluginComponentProps {
  /** Plugin slug (URL-safe name) */
  pluginSlug: string;
  /** Named export from the plugin's components bundle */
  componentName: string;
  /** Props to pass to the plugin component */
  props?: Record<string, unknown>;
  /** Content hash of the bundle — used as cache-buster query parameter */
  bundleHash?: string | null;
}

/**
 * Dynamically loads and renders a React component from a plugin's ESM bundle.
 *
 * The bundle is fetched from /api/v1/public/plugins/<slug>/components.js
 * and the named export is resolved as a React component.
 */
export function PluginComponent({
  pluginSlug,
  componentName,
  props = {},
  bundleHash,
}: PluginComponentProps) {
  const lazyRef = useRef<ReturnType<typeof lazy> | null>(null);

  if (!lazyRef.current) {
    lazyRef.current = lazy(() =>
      getPluginModule(pluginSlug, bundleHash).then((mod) => {
        const comp = mod[componentName];
        if (typeof comp !== 'function') {
          throw new Error(`Plugin "${pluginSlug}" does not export component "${componentName}"`);
        }
        return { default: comp as React.ComponentType<Record<string, unknown>> };
      }),
    );
  }

  const LazyComponent = lazyRef.current;

  return (
    <PluginErrorBoundary pluginSlug={pluginSlug} componentName={componentName}>
      <Suspense fallback={null}>
        <LazyComponent {...props} />
      </Suspense>
    </PluginErrorBoundary>
  );
}

export default PluginComponent;
