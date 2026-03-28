import { NextRequest, NextResponse } from 'next/server';
import { getI18nConfig, fallbackConfig } from './lib/i18n-config';

// ─── Plugin page routes cache ───────────────────────────────────────────────
// Caches the list of plugin page paths that opt out of the /ext/ prefix.
// These pages are served at their clean URL (e.g. /blog) and internally
// rewritten to /[locale]/ext/... so the existing catch-all route handles them.

let pluginRoutesCache: string[] | null = null;
let pluginRoutesCacheTimestamp = 0;
const PLUGIN_ROUTES_CACHE_TTL_MS = 60_000; // 60 seconds

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

async function getPluginPageRoutes(): Promise<string[]> {
  const now = Date.now();
  if (pluginRoutesCache && now - pluginRoutesCacheTimestamp < PLUGIN_ROUTES_CACHE_TTL_MS) {
    return pluginRoutesCache;
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/public/plugins/pages/routes`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = (await res.json()) as { data: string[] };
      pluginRoutesCache = json.data ?? [];
      pluginRoutesCacheTimestamp = now;
      return pluginRoutesCache;
    }
  } catch {
    // API unavailable — return empty (no rewrites)
  }

  return pluginRoutesCache ?? [];
}

/** Check if a pathname matches a plugin page route (supports wildcard patterns like /blog/*) */
function matchesPluginRoute(pathname: string, routes: string[]): string | null {
  for (const route of routes) {
    if (route.includes('*')) {
      const prefix = route.replace(/\/?\*$/, '');
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return route;
      }
    } else if (pathname === route) {
      return route;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, Next internals
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Fetch locale config from admin API (cached, 1 min TTL)
  const { defaultLocale, supportedLocales } = await getI18nConfig();

  // Check if first segment is a supported locale
  const segments = pathname.split('/');
  const maybeLocale = segments[1];

  if (maybeLocale && supportedLocales.includes(maybeLocale)) {
    if (maybeLocale === defaultLocale) {
      // Default locale should NOT have prefix → redirect to clean URL
      const rest = segments.slice(2).join('/');
      const newPath = rest ? `/${rest}` : '/';
      const url = request.nextUrl.clone();
      url.pathname = newPath;
      return NextResponse.redirect(url);
    }
    // Non-default locale with prefix → check for plugin page rewrite
    const restPath = '/' + segments.slice(2).join('/');
    const pluginRoutes = await getPluginPageRoutes();
    const matchedRoute = matchesPluginRoute(restPath, pluginRoutes);
    if (matchedRoute) {
      // Rewrite /fr/blog → /fr/ext/blog (internal rewrite, URL stays clean)
      const url = request.nextUrl.clone();
      url.pathname = `/${maybeLocale}/ext${restPath}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Check if first segment looks like a locale code but isn't supported
  // → redirect to the same path without the prefix (default locale)
  // Skip 'ext' — it's the plugin storefront pages prefix, not a locale
  const RESERVED_PREFIXES = ['ext', 'api', 'app'];
  if (
    maybeLocale &&
    /^[a-z]{2,3}$/.test(maybeLocale) &&
    !supportedLocales.includes(maybeLocale) &&
    !RESERVED_PREFIXES.includes(maybeLocale)
  ) {
    const rest = segments.slice(2).join('/');
    const newPath = rest ? `/${rest}` : '/';
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  // Check if this is a plugin page with clean URL (no /ext/ prefix)
  const pluginRoutes = await getPluginPageRoutes();
  const matchedRoute = matchesPluginRoute(pathname, pluginRoutes);
  if (matchedRoute) {
    // Rewrite /blog → /[defaultLocale]/ext/blog (internal rewrite, URL stays clean)
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}/ext${pathname}`;
    return NextResponse.rewrite(url);
  }

  // No locale prefix → internally rewrite to /[defaultLocale]/...
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
