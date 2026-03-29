'use client';

import { Component, lazy, Suspense, useRef, type ReactNode, type ErrorInfo } from 'react';
import { API_URL } from '@/lib/config';

// ─── Module cache (avoid re-importing the same bundle) ───────────────────────

const moduleCache = new Map<string, Promise<Record<string, unknown>>>();

function getPluginModule(pluginSlug: string): Promise<Record<string, unknown>> {
  const cached = moduleCache.get(pluginSlug);
  if (cached) return cached;

  const url = `${API_URL}/api/v1/public/plugins/${encodeURIComponent(pluginSlug)}/components.js`;
  const promise = import(/* webpackIgnore: true */ url).then(
    (mod) => mod as Record<string, unknown>,
  );

  moduleCache.set(pluginSlug, promise);

  // On failure, remove from cache so it can be retried
  promise.catch(() => {
    moduleCache.delete(pluginSlug);
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
}

/**
 * Dynamically loads and renders a React component from a plugin's ESM bundle.
 *
 * The bundle is fetched from /api/v1/public/plugins/<slug>/components.js
 * and the named export is resolved as a React component.
 */
export function PluginComponent({ pluginSlug, componentName, props = {} }: PluginComponentProps) {
  const lazyRef = useRef<ReturnType<typeof lazy> | null>(null);

  if (!lazyRef.current) {
    lazyRef.current = lazy(() =>
      getPluginModule(pluginSlug).then((mod) => {
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
