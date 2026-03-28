import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { sanitizePluginHtml } from '@/components/plugins/sanitize-plugin-html';
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

  // Remove scripts from HTML (they'll be executed via ScriptExecutor)
  const htmlWithoutScripts = page.html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Combine page-level scripts with inline scripts from content
  const allScripts = [...(page.scripts ?? []), ...inlineScripts];

  return (
    <div className="plugin-page" data-plugin={page.pluginName} data-plugin-page={page.path}>
      {/* Inject page-level styles */}
      {page.styles && <style dangerouslySetInnerHTML={{ __html: page.styles }} />}

      {/* Set window.FORKCART context */}
      <PluginPageContext path={page.path} requireAuth={page.requireAuth} locale={locale} />

      {/* Render HTML content */}
      <div dangerouslySetInnerHTML={{ __html: sanitizePluginHtml(htmlWithoutScripts) }} />

      {/* Execute scripts */}
      {allScripts.map((script, i) => (
        <ScriptExecutor key={`plugin-page-script-${i}`} content={script} />
      ))}
    </div>
  );
}
