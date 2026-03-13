import type { MetaTags, SeoAnalysis } from '@forkcart/shared';
import { NotFoundError } from '@forkcart/shared';
import type { SeoRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { SEO_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('seo-service');

/** Minimal AI interface the SEO service needs — avoids hard dep on @forkcart/ai */
export interface SeoAIProvider {
  generateText(opts: {
    systemPrompt: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string }>;
}

/** Dependencies for SEO service */
export interface SeoServiceDeps {
  seoRepository: SeoRepository;
  eventBus: EventBus;
  aiProvider?: SeoAIProvider | null;
  baseUrl?: string;
}

/** Default SEO setting keys */
const SETTING_KEYS = {
  SHOP_NAME: 'shop_name',
  DEFAULT_DESCRIPTION_TEMPLATE: 'default_description_template',
  GOOGLE_VERIFICATION: 'google_verification',
  OG_DEFAULT_IMAGE: 'og_default_image',
} as const;

/**
 * SEO service — generates meta tags, schema.org markup, sitemaps, and more.
 * Works without AI (template-based), enhanced with AI when available.
 */
export class SeoService {
  private readonly repo: SeoRepository;
  private readonly events: EventBus;
  private readonly ai: SeoAIProvider | null;
  private readonly baseUrl: string;

  constructor(deps: SeoServiceDeps) {
    this.repo = deps.seoRepository;
    this.events = deps.eventBus;
    this.ai = deps.aiProvider ?? null;
    this.baseUrl = deps.baseUrl ?? 'https://shop.example.com';
  }

  // ─── Meta Tags ────────────────────────────────────────────────

  /** Generate meta tags for a product (AI-enhanced or template-based) */
  async generateMetaTags(productId: string): Promise<MetaTags> {
    const product = await this.repo.getProductWithSeo(productId);
    if (!product) throw new NotFoundError('Product', productId);

    const settings = await this.repo.getAllSettings();
    const shopName = settings[SETTING_KEYS.SHOP_NAME] ?? 'Shop';

    let metaTitle: string;
    let metaDescription: string;
    let metaKeywords: string | undefined;

    if (this.ai) {
      try {
        const result = await this.ai.generateText({
          systemPrompt: `You are an SEO specialist for an e-commerce shop called "${shopName}". Generate SEO metadata in the shop's language. Return valid JSON only: {"metaTitle":"...","metaDescription":"...","metaKeywords":"..."}`,
          prompt: `Generate SEO meta tags for this product:
Name: ${product.name}
Description: ${product.description ?? product.shortDescription ?? 'N/A'}
Price: €${(product.price / 100).toFixed(2)}
SKU: ${product.sku ?? 'N/A'}

Rules:
- metaTitle: max 60 characters, include product name and key benefit
- metaDescription: max 160 characters, compelling with call-to-action
- metaKeywords: comma-separated relevant keywords`,
          maxTokens: 300,
          temperature: 0.5,
        });

        const parsed = JSON.parse(result.text) as {
          metaTitle: string;
          metaDescription: string;
          metaKeywords?: string;
        };
        metaTitle = parsed.metaTitle.slice(0, 255);
        metaDescription = parsed.metaDescription.slice(0, 500);
        metaKeywords = parsed.metaKeywords;
        logger.info({ productId }, 'AI-generated meta tags');
      } catch (error) {
        logger.warn({ productId, error }, 'AI meta generation failed, falling back to template');
        ({ metaTitle, metaDescription, metaKeywords } = this.templateMetaTags(product, shopName));
      }
    } else {
      ({ metaTitle, metaDescription, metaKeywords } = this.templateMetaTags(product, shopName));
    }

    // Persist
    await this.repo.updateProductSeo(productId, { metaTitle, metaDescription, metaKeywords });

    const meta: MetaTags = { metaTitle, metaDescription, metaKeywords };
    await this.events.emit(SEO_EVENTS.META_GENERATED, { productId, meta });
    return meta;
  }

  /** Template-based meta tag generation (no AI needed) */
  private templateMetaTags(
    product: { name: string; shortDescription?: string | null; description?: string | null },
    shopName: string,
  ): { metaTitle: string; metaDescription: string; metaKeywords?: string } {
    const metaTitle = `${product.name} | ${shopName}`.slice(0, 60);

    const shortDesc = product.shortDescription ?? product.description?.slice(0, 100) ?? '';
    const metaDescription =
      `${product.name} - ${shortDesc}. Order now at ${shopName}. ✓ Fast shipping ✓ Secure payment`.slice(
        0,
        160,
      );

    return { metaTitle, metaDescription };
  }

  // ─── Alt Texts ────────────────────────────────────────────────

  /** Generate alt texts for product images */
  async generateAltTexts(productId: string): Promise<Array<{ mediaId: string; alt: string }>> {
    const product = await this.repo.getProductWithSeo(productId);
    if (!product) throw new NotFoundError('Product', productId);

    const mediaItems = await this.repo.getProductMedia(productId);
    if (mediaItems.length === 0) return [];

    const results: Array<{ mediaId: string; alt: string }> = [];

    for (const item of mediaItems) {
      let altText: string;

      if (this.ai) {
        try {
          const res = await this.ai.generateText({
            systemPrompt:
              'You are an accessibility and SEO expert. Generate a concise, descriptive alt text for a product image. Return plain text only, no JSON.',
            prompt: `Product: ${product.name}\nImage filename: ${item.originalName}\nGenerate a descriptive alt text (max 125 characters).`,
            maxTokens: 60,
            temperature: 0.4,
          });
          altText = res.text.replace(/^["']|["']$/g, '').slice(0, 255);
        } catch {
          altText = `${product.name}`;
        }
      } else {
        altText = `${product.name}`;
      }

      await this.repo.updateMediaAltAuto(item.id, altText);
      results.push({ mediaId: item.id, alt: altText });
    }

    await this.events.emit(SEO_EVENTS.ALT_TEXTS_GENERATED, {
      productId,
      count: results.length,
    });

    return results;
  }

  // ─── Bulk Generation ──────────────────────────────────────────

  /** Bulk generate meta tags for multiple products */
  async bulkGenerateMeta(
    productIds: string[],
  ): Promise<Array<{ productId: string; success: boolean; error?: string }>> {
    const results: Array<{ productId: string; success: boolean; error?: string }> = [];

    for (const productId of productIds) {
      try {
        await this.generateMetaTags(productId);
        results.push({ productId, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ productId, success: false, error: message });
        logger.warn({ productId, error: message }, 'Bulk meta generation failed for product');
      }
    }

    await this.events.emit(SEO_EVENTS.BULK_COMPLETED, {
      total: productIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  // ─── Schema.org / JSON-LD ─────────────────────────────────────

  /** Generate JSON-LD Schema.org markup for a product */
  async generateSchemaOrg(productId: string): Promise<Record<string, unknown>> {
    const product = await this.repo.getProductWithSeo(productId);
    if (!product) throw new NotFoundError('Product', productId);

    const settings = await this.repo.getAllSettings();
    const shopName = settings[SETTING_KEYS.SHOP_NAME] ?? 'Shop';
    const mediaItems = await this.repo.getProductMedia(productId);
    const firstImage = mediaItems[0];

    const availability =
      product.inventoryQuantity > 0 || !product.trackInventory
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.metaDescription ?? product.shortDescription ?? product.description ?? '',
      sku: product.sku ?? undefined,
      image: firstImage ? `${this.baseUrl}/uploads/${firstImage.filename}` : undefined,
      brand: {
        '@type': 'Brand',
        name: shopName,
      },
      offers: {
        '@type': 'Offer',
        price: (product.price / 100).toFixed(2),
        priceCurrency: product.currency,
        availability,
        url: `${this.baseUrl}/products/${product.slug}`,
      },
    };

    return schema;
  }

  /** Generate WebSite schema */
  generateWebSiteSchema(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: this.baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  /** Generate BreadcrumbList schema */
  generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  // ─── Open Graph / Social ──────────────────────────────────────

  /** Generate Open Graph meta tags for a product */
  async generateOpenGraphTags(productId: string): Promise<Record<string, string>> {
    const product = await this.repo.getProductWithSeo(productId);
    if (!product) throw new NotFoundError('Product', productId);

    const settings = await this.repo.getAllSettings();
    const shopName = settings[SETTING_KEYS.SHOP_NAME] ?? 'Shop';
    const mediaItems = await this.repo.getProductMedia(productId);
    const firstImage = mediaItems[0];
    const imageUrl =
      product.ogImage ??
      (firstImage ? `${this.baseUrl}/uploads/${firstImage.filename}` : null) ??
      settings[SETTING_KEYS.OG_DEFAULT_IMAGE] ??
      '';

    const title = product.metaTitle ?? product.name;
    const description =
      product.metaDescription ?? product.shortDescription ?? product.description ?? '';

    return {
      'og:type': 'product',
      'og:title': title,
      'og:description': description.slice(0, 200),
      'og:image': imageUrl,
      'og:url': `${this.baseUrl}/products/${product.slug}`,
      'og:site_name': shopName,
      'og:price:amount': (product.price / 100).toFixed(2),
      'og:price:currency': product.currency,
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description.slice(0, 200),
      'twitter:image': imageUrl,
    };
  }

  // ─── Sitemap ──────────────────────────────────────────────────

  /** Generate XML sitemap */
  async generateSitemap(): Promise<string> {
    const [activeProducts, activeCategories] = await Promise.all([
      this.repo.getActiveProducts(),
      this.repo.getActiveCategories(),
    ]);

    const urls: Array<{ loc: string; lastmod?: string; priority: string; changefreq: string }> = [];

    // Homepage
    urls.push({
      loc: this.baseUrl,
      priority: '1.0',
      changefreq: 'daily',
    });

    // Categories
    for (const cat of activeCategories) {
      urls.push({
        loc: `${this.baseUrl}/categories/${cat.slug}`,
        lastmod: cat.updatedAt?.toISOString(),
        priority: '0.8',
        changefreq: 'weekly',
      });
    }

    // Products (cap at 50,000 as per Google limit)
    for (const prod of activeProducts.slice(0, 49_990)) {
      urls.push({
        loc: `${this.baseUrl}/products/${prod.slug}`,
        lastmod: prod.updatedAt?.toISOString(),
        priority: '0.6',
        changefreq: 'weekly',
      });
    }

    // Static pages
    const staticPages = [
      { path: '/imprint', priority: '0.3' },
      { path: '/privacy', priority: '0.3' },
      { path: '/terms', priority: '0.3' },
      { path: '/contact', priority: '0.5' },
    ];
    for (const page of staticPages) {
      urls.push({
        loc: `${this.baseUrl}${page.path}`,
        priority: page.priority,
        changefreq: 'monthly',
      });
    }

    const xmlUrls = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;
  }

  // ─── Robots.txt ───────────────────────────────────────────────

  /** Generate robots.txt content */
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/

Sitemap: ${this.baseUrl}/sitemap.xml`;
  }

  // ─── SEO Analysis ─────────────────────────────────────────────

  /** Analyze SEO status of a product page */
  async analyzeProductSeo(productId: string): Promise<SeoAnalysis> {
    const product = await this.repo.getProductWithSeo(productId);
    if (!product) throw new NotFoundError('Product', productId);

    const mediaItems = await this.repo.getProductMedia(productId);
    const issues: SeoAnalysis['issues'] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Title check
    if (!product.metaTitle) {
      issues.push({ type: 'error', message: 'Missing meta title', field: 'metaTitle' });
      score -= 20;
    } else if (product.metaTitle.length > 60) {
      issues.push({
        type: 'warning',
        message: `Meta title too long (${product.metaTitle.length}/60 chars)`,
        field: 'metaTitle',
      });
      score -= 5;
    } else if (product.metaTitle.length < 30) {
      issues.push({
        type: 'warning',
        message: `Meta title too short (${product.metaTitle.length}/30+ chars recommended)`,
        field: 'metaTitle',
      });
      score -= 5;
    }

    // Description check
    if (!product.metaDescription) {
      issues.push({
        type: 'error',
        message: 'Missing meta description',
        field: 'metaDescription',
      });
      score -= 20;
    } else if (product.metaDescription.length > 160) {
      issues.push({
        type: 'warning',
        message: `Meta description too long (${product.metaDescription.length}/160 chars)`,
        field: 'metaDescription',
      });
      score -= 5;
    }

    // Description text
    if (!product.description && !product.shortDescription) {
      issues.push({ type: 'error', message: 'No product description', field: 'description' });
      score -= 15;
    }

    // Images
    if (mediaItems.length === 0) {
      issues.push({ type: 'warning', message: 'No product images' });
      score -= 10;
    } else {
      const withoutAlt = mediaItems.filter((m) => !m.alt && !m.altAuto);
      if (withoutAlt.length > 0) {
        issues.push({
          type: 'warning',
          message: `${withoutAlt.length} image(s) missing alt text`,
        });
        score -= Math.min(10, withoutAlt.length * 3);
      }
    }

    // Keywords
    if (!product.metaKeywords) {
      issues.push({ type: 'info', message: 'No meta keywords set', field: 'metaKeywords' });
      score -= 5;
    }

    // AI-powered suggestions
    if (this.ai && product.metaTitle && product.metaDescription) {
      try {
        const res = await this.ai.generateText({
          systemPrompt:
            'You are an SEO analyst. Provide 2-3 short actionable improvement suggestions. Return as JSON array of strings.',
          prompt: `Analyze this product SEO:
Title: ${product.metaTitle}
Description: ${product.metaDescription}
Product name: ${product.name}
Keywords: ${product.metaKeywords ?? 'none'}`,
          maxTokens: 200,
          temperature: 0.4,
        });
        const parsed = JSON.parse(res.text) as string[];
        suggestions.push(...parsed);
      } catch {
        // AI suggestions are optional
      }
    }

    if (!product.metaTitle) suggestions.push('Generate meta tags to improve search visibility');
    if (mediaItems.some((m) => !m.alt && !m.altAuto))
      suggestions.push('Generate alt texts for all product images');

    return { score: Math.max(0, score), issues, suggestions };
  }

  // ─── Settings ─────────────────────────────────────────────────

  /** Get all SEO settings */
  async getSettings(): Promise<Record<string, string>> {
    return this.repo.getAllSettings();
  }

  /** Update SEO settings */
  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(settings)) {
      await this.repo.setSetting(key, value);
    }

    await this.events.emit(SEO_EVENTS.SETTINGS_UPDATED, { settings });
    return this.repo.getAllSettings();
  }

  // ─── Dashboard ────────────────────────────────────────────────

  /** Get SEO overview for all active products */
  async getProductSeoOverview() {
    return this.repo.getProductSeoOverview();
  }
}

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
