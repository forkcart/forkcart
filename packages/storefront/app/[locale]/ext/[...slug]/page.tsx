import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { sanitizePluginHtml } from '@/components/plugins/sanitize-plugin-html';
import { scopePluginCss } from '@/components/plugins/scope-plugin-css';
import { ScriptExecutor } from '@/components/plugins/script-executor';
import { PluginPageContext } from './plugin-page-context';

interface PluginPageData {
  pluginName: string;
  path: string;
  title: string;
  html: string;
  scripts?: string[];
  styles?: string;
  requireAuth?: boolean;
  metaDescription?: string;
  source: string;
}

interface PluginPageResponse {
  data?: PluginPageData;
  error?: { code: string; message: string };
}

async function fetchPluginPage(pagePath: string): Promise<PluginPageData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/plugins/pages${pagePath}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as PluginPageResponse;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagePath = `/${slug.join('/')}`;
  const page = await fetchPluginPage(pagePath);

  if (!page) return {};

  return {
    title: page.title,
    description: page.metaDescription,
  };
}

export default async function PluginPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  const pagePath = `/${slug.join('/')}`;
  const page = await fetchPluginPage(pagePath);

  if (!page) {
    notFound();
  }

  // Auth check — redirect to login if page requires authentication
  if (page.requireAuth) {
    // Server-side auth check via cookie forwarding would go here.
    // For now, we set a flag and let the client component handle it.
  }

  // Extract inline scripts from HTML content
  const scriptMatches = page.html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const inlineScripts = scriptMatches
    .map((s) => {
      const match = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      return match?.[1]?.trim() ?? '';
    })
    .filter((s) => s.length > 0);

  // Extract and scope inline <style> tags from HTML content
  const styleMatches = page.html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineStyles = styleMatches
    .map((s) => {
      const match = s.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      return match?.[1]?.trim() ?? '';
    })
    .filter((s) => s.length > 0)
    .map((s) => scopePluginCss(s, page.pluginName))
    .join('\n');

  // Remove scripts and styles from HTML
  const htmlClean = page.html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Scope page-level styles
  const scopedPageStyles = page.styles ? scopePluginCss(page.styles, page.pluginName) : '';

  // Combine all scoped styles
  const allStyles = [scopedPageStyles, inlineStyles].filter(Boolean).join('\n');

  // Combine page-level scripts with inline scripts from content
  const allScripts = [...(page.scripts ?? []), ...inlineScripts];

  return (
    <div className="plugin-page" data-plugin={page.pluginName} data-plugin-page={page.path}>
      {/* Inject scoped page-level styles */}
      {allStyles && <style dangerouslySetInnerHTML={{ __html: allStyles }} />}

      {/* Set window.FORKCART context */}
      <PluginPageContext path={page.path} requireAuth={page.requireAuth} locale={locale} />

      {/* Render HTML content */}
      <div dangerouslySetInnerHTML={{ __html: sanitizePluginHtml(htmlClean) }} />

      {/* Execute scripts */}
      {allScripts.map((script, i) => (
        <ScriptExecutor key={`plugin-page-script-${i}`} content={script} />
      ))}
    </div>
  );
}
