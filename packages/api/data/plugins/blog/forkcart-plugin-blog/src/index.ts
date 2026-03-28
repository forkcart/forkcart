import { definePlugin, ref } from '@forkcart/plugin-sdk';

/**
 * ForkCart Blog Plugin
 *
 * Adds a full blog/content marketing system to your ForkCart store.
 * Create, manage, and publish blog posts with categories, tags,
 * SEO metadata, and product linking.
 *
 * Features:
 * - Blog post CRUD with rich content
 * - Categories & tags
 * - SEO metadata (title, description, slug)
 * - Product linking (mention products in posts)
 * - Storefront pages (/ext/blog, /ext/blog/:slug)
 * - PageBuilder block for latest posts
 * - Admin dashboard with post editor
 * - Scheduled publishing
 * - RSS feed
 * - CLI for bulk operations
 *
 * @author Tyto 🦉
 * @version 1.0.0
 */

export default definePlugin({
  name: 'blog',
  version: '1.0.0',
  type: 'general',
  description: 'Add a blog to your ForkCart store — create posts, link products, boost SEO',
  author: 'Tyto 🦉',
  homepage: 'https://github.com/forkcart/forkcart-plugin-blog',
  license: 'MIT',
  keywords: ['blog', 'content', 'seo', 'marketing', 'posts', 'articles'],

  // ─── SETTINGS ───────────────────────────────────────

  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable Blog',
      default: true,
      description: 'Show blog pages on the storefront',
    },
    postsPerPage: {
      type: 'number',
      label: 'Posts per Page',
      default: 10,
      min: 1,
      max: 50,
    },
    enableComments: {
      type: 'boolean',
      label: 'Enable Comments',
      default: false,
      description: 'Allow customers to comment on posts (coming soon)',
    },
    defaultAuthor: {
      type: 'string',
      label: 'Default Author Name',
      default: '',
      placeholder: 'Your Store Team',
    },
    excerptLength: {
      type: 'number',
      label: 'Excerpt Length (characters)',
      default: 200,
      min: 50,
      max: 500,
    },
    showInNav: {
      type: 'boolean',
      label: 'Show "Blog" in Navigation',
      default: true,
    },
    rssEnabled: {
      type: 'boolean',
      label: 'Enable RSS Feed',
      default: true,
    },
    dateFormat: {
      type: 'select',
      label: 'Date Format',
      options: ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD.MM.YYYY',
    },
  },

  permissions: ['products:read'],

  // ─── EVENT HOOKS ────────────────────────────────────

  hooks: {
    'product:created': async (event, ctx) => {
      ctx.logger.info('New product created — consider writing a blog post about it!', {
        productId: event.payload.productId,
      });
    },
  },

  // ─── FILTERS ────────────────────────────────────────

  filters: {
    'storefront:head': async (html, ctx) => {
      if (!ctx.settings.rssEnabled) return html;
      return html + '\n<link rel="alternate" type="application/rss+xml" title="Blog RSS" href="/api/v1/public/plugins/blog/rss" />';
    },
  },

  // ─── API ROUTES ─────────────────────────────────────

  routes: (router) => {
    // ── Storefront: Blog list page (contentRoute for storefrontPages) ──
    router.get('/storefront/blog-list', async (c) => {
      const db = c.get('db');
      const settings = c.get('pluginSettings');
      const page = parseInt(c.req.query('page') || '1');
      const limit = (settings?.postsPerPage as number) || 10;
      const offset = (page - 1) * limit;

      const result = await db.execute(
        `SELECT id, title, slug, excerpt, cover_image, author, published_at, category, tags, reading_time_min
         FROM plugin_blog_posts
         WHERE status = 'published' AND published_at <= NOW()
         ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await db.execute(
        `SELECT COUNT(*) as total FROM plugin_blog_posts WHERE status = 'published' AND published_at <= NOW()`
      );
      const total = parseInt(countResult.rows?.[0]?.total || '0');

      return c.json({
        data: result.rows || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    });

    // ── Storefront: Single blog post page (contentRoute for storefrontPages) ──
    router.get('/storefront/blog-post', async (c) => {
      const slug = c.req.query('slug') || '';
      const db = c.get('db');

      if (!slug) {
        return c.json({ error: 'No slug provided' }, 400);
      }

      const result = await db.execute(
        `SELECT * FROM plugin_blog_posts WHERE slug = $1 AND status = 'published' AND published_at <= NOW()`,
        [slug]
      );

      if (!result.rows || result.rows.length === 0) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const post = result.rows[0];
      await db.execute('UPDATE plugin_blog_posts SET views = views + 1 WHERE id = $1', [post.id]);

      const products = await db.execute(
        `SELECT lp.product_id, p.name, p.slug as product_slug, p.price, p.currency
         FROM plugin_blog_product_links lp LEFT JOIN products p ON p.id = lp.product_id
         WHERE lp.post_id = $1 ORDER BY lp.sort_order ASC`,
        [post.id]
      );

      return c.json({ data: { ...post, linkedProducts: products.rows || [] } });
    });

    // ── Public: List published posts ──
    router.get('/posts', async (c) => {
      const db = c.get('db');
      const settings = c.get('pluginSettings');
      const page = parseInt(c.req.query('page') || '1');
      const limit = (settings?.postsPerPage as number) || 10;
      const offset = (page - 1) * limit;
      const category = c.req.query('category') || '';
      const tag = c.req.query('tag') || '';

      let query = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.author,
               p.published_at, p.category, p.tags, p.reading_time_min,
               p.meta_title, p.meta_description
        FROM plugin_blog_posts p
        WHERE p.status = 'published' AND p.published_at <= NOW()
      `;
      const params: any[] = [];
      let paramIdx = 1;

      if (category) {
        query += ` AND p.category = $${paramIdx}`;
        params.push(category);
        paramIdx++;
      }

      if (tag) {
        query += ` AND p.tags LIKE $${paramIdx}`;
        params.push(`%${tag}%`);
        paramIdx++;
      }

      query += ` ORDER BY p.published_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(limit, offset);

      const result = await db.execute(query, params);

      // Total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM plugin_blog_posts WHERE status = 'published' AND published_at <= NOW()`;
      const countParams: any[] = [];
      let cParamIdx = 1;
      if (category) {
        countQuery += ` AND category = $${cParamIdx}`;
        countParams.push(category);
        cParamIdx++;
      }
      if (tag) {
        countQuery += ` AND tags LIKE $${cParamIdx}`;
        countParams.push(`%${tag}%`);
      }
      const countResult = await db.execute(countQuery, countParams);
      const total = parseInt(countResult.rows?.[0]?.total || '0');

      return c.json({
        data: result.rows || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    });

    // ── Public: Get single post by slug ──
    router.get('/posts/:slug', async (c) => {
      const slug = c.req.param('slug');
      const db = c.get('db');

      const result = await db.execute(
        `SELECT * FROM plugin_blog_posts
         WHERE slug = $1 AND status = 'published' AND published_at <= NOW()`,
        [slug]
      );

      if (!result.rows || result.rows.length === 0) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const post = result.rows[0];

      // Track view
      await db.execute(
        'UPDATE plugin_blog_posts SET views = views + 1 WHERE id = $1',
        [post.id]
      );

      // Get linked products
      const products = await db.execute(
        `SELECT lp.product_id, p.name, p.slug as product_slug, p.price, p.currency
         FROM plugin_blog_product_links lp
         LEFT JOIN products p ON p.id = lp.product_id
         WHERE lp.post_id = $1
         ORDER BY lp.sort_order ASC`,
        [post.id]
      );

      return c.json({
        data: { ...post, linkedProducts: products.rows || [] },
      });
    });

    // ── Public: Get categories ──
    router.get('/categories', async (c) => {
      const db = c.get('db');
      const result = await db.execute(
        `SELECT category, COUNT(*) as count
         FROM plugin_blog_posts
         WHERE status = 'published' AND published_at <= NOW() AND category IS NOT NULL AND category != ''
         GROUP BY category ORDER BY count DESC`
      );
      return c.json({ data: result.rows || [] });
    });

    // ── Public: Get tags ──
    router.get('/tags', async (c) => {
      const db = c.get('db');
      const result = await db.execute(
        `SELECT DISTINCT unnest(string_to_array(tags, ',')) as tag
         FROM plugin_blog_posts
         WHERE status = 'published' AND published_at <= NOW() AND tags IS NOT NULL AND tags != ''
         ORDER BY tag`
      );
      return c.json({ data: (result.rows || []).map((r: any) => r.tag.trim()) });
    });

    // ── Public: RSS Feed ──
    router.get('/rss', async (c) => {
      const db = c.get('db');
      const settings = c.get('pluginSettings');

      if (!settings?.rssEnabled) {
        return c.json({ error: 'RSS disabled' }, 404);
      }

      const result = await db.execute(
        `SELECT title, slug, excerpt, author, published_at
         FROM plugin_blog_posts
         WHERE status = 'published' AND published_at <= NOW()
         ORDER BY published_at DESC LIMIT 20`
      );

      const items = (result.rows || []).map((p: any) => `
        <item>
          <title><![CDATA[${p.title}]]></title>
          <link>/ext/blog/${p.slug}</link>
          <description><![CDATA[${p.excerpt || ''}]]></description>
          <author>${p.author || ''}</author>
          <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
          <guid>/ext/blog/${p.slug}</guid>
        </item>`).join('');

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog</title>
    <description>Latest posts</description>
    <language>de</language>
    ${items}
  </channel>
</rss>`;

      return new Response(rss, {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      });
    });

    // ── Admin: Create post ──
    router.post('/admin/posts', async (c) => {
      const db = c.get('db');
      const logger = c.get('logger');
      const body = await c.req.json();

      const slug = body.slug || body.title.toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/^-|-$/g, '');

      // Calculate reading time (~200 words/min)
      const wordCount = (body.content || '').split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));

      const excerpt = body.excerpt || (body.content || '').substring(0, 200).replace(/<[^>]*>/g, '');

      const result = await db.execute(
        `INSERT INTO plugin_blog_posts
         (title, slug, content, excerpt, cover_image, author, category, tags,
          status, published_at, meta_title, meta_description, reading_time_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, slug`,
        [
          body.title,
          slug,
          body.content || '',
          excerpt,
          body.coverImage || null,
          body.author || null,
          body.category || null,
          body.tags || null,
          body.status || 'draft',
          body.status === 'published' ? (body.publishedAt || new Date().toISOString()) : null,
          body.metaTitle || body.title,
          body.metaDescription || excerpt,
          readingTime,
        ]
      );

      logger.info('Blog post created', { slug, status: body.status });
      return c.json({ ok: true, data: result.rows?.[0] });
    });

    // ── Admin: Update post ──
    router.put('/admin/posts/:id', async (c) => {
      const id = c.req.param('id');
      const db = c.get('db');
      const body = await c.req.json();

      const wordCount = (body.content || '').split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));
      const excerpt = body.excerpt || (body.content || '').substring(0, 200).replace(/<[^>]*>/g, '');

      await db.execute(
        `UPDATE plugin_blog_posts SET
          title = $1, content = $2, excerpt = $3, cover_image = $4,
          author = $5, category = $6, tags = $7, status = $8,
          published_at = CASE WHEN $8 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
          meta_title = $9, meta_description = $10, reading_time_min = $11,
          updated_at = NOW()
         WHERE id = $12`,
        [
          body.title, body.content, excerpt, body.coverImage || null,
          body.author, body.category, body.tags, body.status || 'draft',
          body.metaTitle || body.title, body.metaDescription || excerpt,
          readingTime, id,
        ]
      );

      return c.json({ ok: true });
    });

    // ── Admin: Delete post ──
    router.delete('/admin/posts/:id', async (c) => {
      const id = c.req.param('id');
      const db = c.get('db');

      await db.execute('DELETE FROM plugin_blog_product_links WHERE post_id = $1', [id]);
      await db.execute('DELETE FROM plugin_blog_posts WHERE id = $1', [id]);

      return c.json({ ok: true });
    });

    // ── Admin: List ALL posts (including drafts) ──
    router.get('/admin/posts', async (c) => {
      const db = c.get('db');
      const result = await db.execute(
        `SELECT id, title, slug, status, author, category, published_at, views, created_at, updated_at
         FROM plugin_blog_posts ORDER BY created_at DESC`
      );
      return c.json({ data: result.rows || [] });
    });

    // ── Admin: Get single post for editing ──
    router.get('/admin/posts/:id', async (c) => {
      const id = c.req.param('id');
      const db = c.get('db');

      const result = await db.execute('SELECT * FROM plugin_blog_posts WHERE id = $1', [id]);
      if (!result.rows?.length) return c.json({ error: 'Not found' }, 404);

      const links = await db.execute(
        `SELECT lp.product_id, p.name FROM plugin_blog_product_links lp
         LEFT JOIN products p ON p.id = lp.product_id
         WHERE lp.post_id = $1 ORDER BY lp.sort_order`,
        [id]
      );

      return c.json({ data: { ...result.rows[0], linkedProducts: links.rows || [] } });
    });

    // ── Admin: Link products to post ──
    router.post('/admin/posts/:id/products', async (c) => {
      const postId = c.req.param('id');
      const { productIds } = await c.req.json();
      const db = c.get('db');

      await db.execute('DELETE FROM plugin_blog_product_links WHERE post_id = $1', [postId]);

      for (let i = 0; i < (productIds || []).length; i++) {
        await db.execute(
          'INSERT INTO plugin_blog_product_links (post_id, product_id, sort_order) VALUES ($1, $2, $3)',
          [postId, productIds[i], i]
        );
      }

      return c.json({ ok: true, count: (productIds || []).length });
    });

    // ── Storefront: Blog listing page (contentRoute for storefrontPages) ──
    router.get('/storefront/blog-list', async (c) => {
      return c.json({
        html: `
          <div class="blog-container">
            <div class="blog-header">
              <h1>Blog</h1>
            </div>
            <div id="blog-categories" class="blog-categories"></div>
            <div id="blog-grid" class="blog-grid">
              <div style="text-align:center;padding:3rem;color:#9ca3af;grid-column:1/-1;">Lade Beiträge...</div>
            </div>
            <div id="blog-pagination" class="blog-pagination"></div>
          </div>
        `,
      });
    });

    // ── Storefront: Single blog post page (contentRoute for storefrontPages) ──
    router.get('/storefront/blog-post', async (c) => {
      return c.json({
        html: `
          <div class="post-container" id="blog-post-root">
            <div style="text-align:center;padding:3rem;color:#9ca3af;">Lade Beitrag...</div>
          </div>
        `,
      });
    });

    // ── Admin: Dashboard data ──
    router.get('/admin/dashboard', async (c) => {
      const db = c.get('db');

      const stats = await db.execute(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'draft') as drafts,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COALESCE(SUM(views), 0) as total_views
        FROM plugin_blog_posts
      `);

      const recent = await db.execute(
        `SELECT id, title, slug, status, views, published_at, created_at
         FROM plugin_blog_posts ORDER BY created_at DESC LIMIT 10`
      );

      const popular = await db.execute(
        `SELECT id, title, slug, views, published_at
         FROM plugin_blog_posts WHERE status = 'published'
         ORDER BY views DESC LIMIT 5`
      );

      const s = stats.rows?.[0] || {};

      return c.json({
        html: `
          <div id="blog-admin" style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;">
            <style>
              .ba-btn{background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:.875rem;font-weight:500;transition:background .2s;text-decoration:none;display:inline-block}
              .ba-btn:hover{background:#2563eb}
              .ba-btn-sm{padding:5px 12px;font-size:.8rem}
              .ba-btn-danger{background:#ef4444}.ba-btn-danger:hover{background:#dc2626}
              .ba-btn-success{background:#16a34a}.ba-btn-success:hover{background:#15803d}
              .ba-btn-ghost{background:transparent;color:#6b7280;border:1px solid #e5e7eb}.ba-btn-ghost:hover{background:#f9fafb}
              .ba-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;margin-bottom:1rem}
              .ba-stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;text-align:center}
              .ba-stat-val{font-size:2rem;font-weight:700}.ba-stat-lbl{color:#64748b;font-size:.875rem;margin-top:.25rem}
              .ba-input{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem;box-sizing:border-box;outline:none}
              .ba-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
              .ba-textarea{min-height:300px;font-family:monospace;font-size:.85rem;line-height:1.6;resize:vertical}
              .ba-table{width:100%;border-collapse:collapse}
              .ba-table th{text-align:left;padding:10px 12px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em}
              .ba-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
              .ba-table tr:hover{background:#f8fafc}
              .ba-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:500}
              .ba-badge-green{background:#dcfce7;color:#16a34a}
              .ba-badge-yellow{background:#fef9c3;color:#ca8a04}
              .ba-badge-blue{background:#dbeafe;color:#2563eb}
              .ba-badge-gray{background:#f3f4f6;color:#6b7280}
              .ba-section{display:none}.ba-section.active{display:block}
              .ba-tabs{display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:1.5rem}
              .ba-tab{padding:10px 20px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:#6b7280;font-weight:500;transition:all .2s}
              .ba-tab.active{color:#3b82f6;border-bottom-color:#3b82f6}.ba-tab:hover{color:#1f2937}
              .ba-form-group{margin-bottom:1rem}
              .ba-form-group label{display:block;font-weight:500;margin-bottom:.5rem;color:#374151;font-size:.9rem}
              .ba-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
            </style>

            <!-- STATS -->
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-bottom:1.5rem;">
              <div class="ba-stat"><div class="ba-stat-val" style="color:#1f2937">${s.total || 0}</div><div class="ba-stat-lbl">Gesamt</div></div>
              <div class="ba-stat"><div class="ba-stat-val" style="color:#16a34a">${s.published || 0}</div><div class="ba-stat-lbl">Veröffentlicht</div></div>
              <div class="ba-stat"><div class="ba-stat-val" style="color:#ca8a04">${s.drafts || 0}</div><div class="ba-stat-lbl">Entwürfe</div></div>
              <div class="ba-stat"><div class="ba-stat-val" style="color:#2563eb">${s.scheduled || 0}</div><div class="ba-stat-lbl">Geplant</div></div>
              <div class="ba-stat"><div class="ba-stat-val" style="color:#8b5cf6">${s.total_views || 0}</div><div class="ba-stat-lbl">Views</div></div>
            </div>

            <div class="ba-tabs">
              <div class="ba-tab active" onclick="baTab('list',this)">📝 Beiträge</div>
              <div class="ba-tab" onclick="baTab('editor',this)">✏️ Neuer Beitrag</div>
            </div>

            <!-- POST LIST -->
            <div id="ba-list" class="ba-section active">
              <table class="ba-table">
                <thead><tr><th>Titel</th><th>Status</th><th>Views</th><th>Datum</th><th>Aktion</th></tr></thead>
                <tbody>
                  ${(recent.rows || []).map((p: any) => {
                    const badge = p.status === 'published' ? 'green' : p.status === 'scheduled' ? 'blue' : 'yellow';
                    const label = p.status === 'published' ? 'Live' : p.status === 'scheduled' ? 'Geplant' : 'Entwurf';
                    const date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : new Date(p.created_at).toLocaleDateString('de-DE');
                    return `<tr>
                      <td><strong>${p.title}</strong></td>
                      <td><span class="ba-badge ba-badge-${badge}">${label}</span></td>
                      <td>${p.views || 0}</td>
                      <td style="color:#9ca3af">${date}</td>
                      <td>
                        <button class="ba-btn ba-btn-ghost ba-btn-sm" onclick="baEditPost('${p.id}')">Bearbeiten</button>
                        <button class="ba-btn ba-btn-danger ba-btn-sm" onclick="baDeletePost('${p.id}','${p.title.replace(/'/g, "\\'")}')">✕</button>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
              ${(!recent.rows || recent.rows.length === 0) ? '<div style="text-align:center;padding:2rem;color:#9ca3af;">Noch keine Beiträge. Erstelle deinen ersten!</div>' : ''}
            </div>

            <!-- POST EDITOR -->
            <div id="ba-editor" class="ba-section">
              <div class="ba-card">
                <input type="hidden" id="ba-post-id" value="" />
                <div class="ba-form-group">
                  <label>Titel</label>
                  <input type="text" id="ba-title" class="ba-input" placeholder="Mein erster Blogpost..." />
                </div>
                <div class="ba-row">
                  <div class="ba-form-group">
                    <label>Slug (URL)</label>
                    <input type="text" id="ba-slug" class="ba-input" placeholder="mein-erster-blogpost" />
                  </div>
                  <div class="ba-form-group">
                    <label>Autor</label>
                    <input type="text" id="ba-author" class="ba-input" placeholder="Max Mustermann" />
                  </div>
                </div>
                <div class="ba-row">
                  <div class="ba-form-group">
                    <label>Kategorie</label>
                    <input type="text" id="ba-category" class="ba-input" placeholder="News, Tipps, Updates..." />
                  </div>
                  <div class="ba-form-group">
                    <label>Tags (kommagetrennt)</label>
                    <input type="text" id="ba-tags" class="ba-input" placeholder="produkt, neuheit, angebot" />
                  </div>
                </div>
                <div class="ba-form-group">
                  <label>Cover-Bild URL</label>
                  <input type="text" id="ba-cover" class="ba-input" placeholder="https://..." />
                </div>
                <div class="ba-form-group">
                  <label>Inhalt (HTML)</label>
                  <textarea id="ba-content" class="ba-input ba-textarea" placeholder="<h2>Willkommen!</h2><p>Dein Blogpost...</p>"></textarea>
                </div>
                <div class="ba-row">
                  <div class="ba-form-group">
                    <label>SEO Titel</label>
                    <input type="text" id="ba-meta-title" class="ba-input" placeholder="Wird aus Titel generiert" />
                  </div>
                  <div class="ba-form-group">
                    <label>SEO Beschreibung</label>
                    <input type="text" id="ba-meta-desc" class="ba-input" placeholder="Wird aus Inhalt generiert" />
                  </div>
                </div>

                <div style="display:flex;gap:10px;margin-top:1rem;">
                  <button class="ba-btn" onclick="baSavePost('draft')">📄 Als Entwurf speichern</button>
                  <button class="ba-btn ba-btn-success" onclick="baSavePost('published')">🚀 Veröffentlichen</button>
                  <button class="ba-btn ba-btn-ghost" onclick="baClearEditor()">Abbrechen</button>
                </div>
              </div>
            </div>

            ${(popular.rows && popular.rows.length > 0) ? `
            <div class="ba-card" style="margin-top:1rem;">
              <h4 style="margin-top:0;">🔥 Beliebteste Beiträge</h4>
              ${(popular.rows || []).map((p: any, i: number) =>
                `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i < popular.rows.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                  <span>${p.title}</span>
                  <span class="ba-badge ba-badge-gray">${p.views} Views</span>
                </div>`
              ).join('')}
            </div>` : ''}
          </div>

          <script>
            var BA_API = '/api/v1/public/plugins/blog';

            function baTab(tab, el) {
              document.querySelectorAll('.ba-tab').forEach(function(t) { t.classList.remove('active'); });
              el.classList.add('active');
              document.getElementById('ba-list').classList.toggle('active', tab === 'list');
              document.getElementById('ba-editor').classList.toggle('active', tab === 'editor');
              if (tab === 'editor' && !document.getElementById('ba-post-id').value) baClearEditor();
            }

            function baClearEditor() {
              document.getElementById('ba-post-id').value = '';
              ['ba-title','ba-slug','ba-author','ba-category','ba-tags','ba-cover','ba-content','ba-meta-title','ba-meta-desc'].forEach(function(id) {
                document.getElementById(id).value = '';
              });
            }

            function baSavePost(status) {
              var postId = document.getElementById('ba-post-id').value;
              var data = {
                title: document.getElementById('ba-title').value,
                slug: document.getElementById('ba-slug').value || undefined,
                author: document.getElementById('ba-author').value || undefined,
                category: document.getElementById('ba-category').value || undefined,
                tags: document.getElementById('ba-tags').value || undefined,
                coverImage: document.getElementById('ba-cover').value || undefined,
                content: document.getElementById('ba-content').value,
                metaTitle: document.getElementById('ba-meta-title').value || undefined,
                metaDescription: document.getElementById('ba-meta-desc').value || undefined,
                status: status,
              };

              var method = postId ? 'PUT' : 'POST';
              var url = postId ? BA_API + '/admin/posts/' + postId : BA_API + '/admin/posts';

              fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                  if (res.ok || res.data) {
                    alert(status === 'published' ? 'Veröffentlicht!' : 'Entwurf gespeichert!');
                    location.reload();
                  }
                });
            }

            function baEditPost(id) {
              fetch(BA_API + '/admin/posts/' + id)
                .then(function(r) { return r.json(); })
                .then(function(res) {
                  var p = res.data;
                  document.getElementById('ba-post-id').value = p.id;
                  document.getElementById('ba-title').value = p.title || '';
                  document.getElementById('ba-slug').value = p.slug || '';
                  document.getElementById('ba-author').value = p.author || '';
                  document.getElementById('ba-category').value = p.category || '';
                  document.getElementById('ba-tags').value = p.tags || '';
                  document.getElementById('ba-cover').value = p.cover_image || '';
                  document.getElementById('ba-content').value = p.content || '';
                  document.getElementById('ba-meta-title').value = p.meta_title || '';
                  document.getElementById('ba-meta-desc').value = p.meta_description || '';
                  // Switch to editor tab
                  document.querySelectorAll('.ba-tab').forEach(function(t) { t.classList.remove('active'); });
                  document.querySelectorAll('.ba-tab')[1].classList.add('active');
                  document.getElementById('ba-list').classList.remove('active');
                  document.getElementById('ba-editor').classList.add('active');
                });
            }

            function baDeletePost(id, title) {
              if (!confirm('Beitrag "' + title + '" wirklich löschen?')) return;
              fetch(BA_API + '/admin/posts/' + id, { method: 'DELETE' })
                .then(function() { location.reload(); });
            }
          </script>
        `
      });
    });
  },

  // ─── STOREFRONT PAGES ───────────────────────────────

  storefrontPages: [
    {
      path: '/blog',
      title: 'Blog',
      showInNav: true,
      navLabel: 'Blog',
      navIcon: '📝',
      metaDescription: 'Neuigkeiten, Tipps und Insights aus unserem Shop',
      contentRoute: '/storefront/blog-list',
      styles: `
        .blog-container { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
        .blog-header { margin-bottom: 2rem; }
        .blog-header h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .blog-categories { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .blog-cat-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; font-size: 0.85rem; color: #4b5563; transition: all 0.2s; text-decoration: none; }
        .blog-cat-btn:hover, .blog-cat-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .blog-card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; transition: transform 0.2s, box-shadow 0.2s; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .blog-card a { text-decoration: none; color: inherit; }
        .blog-card-img { width: 100%; height: 200px; object-fit: cover; background: #f3f4f6; }
        .blog-card-body { padding: 1.25rem; }
        .blog-card-meta { font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.5rem; display: flex; gap: 1rem; }
        .blog-card-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; line-height: 1.4; }
        .blog-card-excerpt { font-size: 0.9rem; color: #6b7280; line-height: 1.6; }
        .blog-card-tag { font-size: 0.75rem; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 10px; }
        .blog-pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 2rem; }
        .blog-page-btn { padding: 8px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; }
        .blog-page-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
        @media (max-width: 640px) { .blog-grid { grid-template-columns: 1fr; } }
      `,
      scripts: [`
        var fc = window.FORKCART || {};
        var apiUrl = fc.apiUrl || '';

        function loadBlogPosts(page, category) {
          page = page || 1;
          var url = apiUrl + '/api/v1/public/plugins/blog/posts?page=' + page;
          if (category) url += '&category=' + encodeURIComponent(category);

          fetch(url).then(function(r) { return r.json(); }).then(function(res) {
            var grid = document.getElementById('blog-grid');
            if (!res.data || res.data.length === 0) {
              grid.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af;grid-column:1/-1;">Noch keine Beiträge vorhanden.</div>';
              return;
            }
            grid.innerHTML = res.data.map(function(p) {
              var date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : '';
              return '<div class="blog-card"><a href="/ext/blog/' + p.slug + '">'
                + (p.cover_image ? '<img class="blog-card-img" src="' + p.cover_image + '" alt="' + (p.title || '') + '" loading="lazy" />' : '<div class="blog-card-img"></div>')
                + '<div class="blog-card-body">'
                + '<div class="blog-card-meta"><span>' + date + '</span>'
                + (p.author ? '<span>' + p.author + '</span>' : '')
                + (p.reading_time_min ? '<span>' + p.reading_time_min + ' min</span>' : '')
                + '</div>'
                + '<div class="blog-card-title">' + p.title + '</div>'
                + '<div class="blog-card-excerpt">' + (p.excerpt || '') + '</div>'
                + (p.category ? '<div style="margin-top:.75rem"><span class="blog-card-tag">' + p.category + '</span></div>' : '')
                + '</div></a></div>';
            }).join('');

            // Pagination
            var pag = document.getElementById('blog-pagination');
            if (res.pagination && res.pagination.pages > 1) {
              var btns = '';
              for (var i = 1; i <= res.pagination.pages; i++) {
                btns += '<button class="blog-page-btn' + (i === page ? ' active' : '') + '" onclick="loadBlogPosts(' + i + ')">' + i + '</button>';
              }
              pag.innerHTML = btns;
            } else {
              pag.innerHTML = '';
            }
          });
        }

        // Load categories
        fetch(apiUrl + '/api/v1/public/plugins/blog/categories')
          .then(function(r) { return r.json(); })
          .then(function(res) {
            var cats = document.getElementById('blog-categories');
            if (res.data && res.data.length > 0) {
              cats.innerHTML = '<a class="blog-cat-btn active" onclick="loadBlogPosts(1);this.parentNode.querySelectorAll(\\'.blog-cat-btn\\').forEach(function(b){b.classList.remove(\\'active\\')});this.classList.add(\\'active\\')">Alle</a>'
                + res.data.map(function(c) {
                  return '<a class="blog-cat-btn" onclick="loadBlogPosts(1,\\'' + c.category + '\\');this.parentNode.querySelectorAll(\\'.blog-cat-btn\\').forEach(function(b){b.classList.remove(\\'active\\')});this.classList.add(\\'active\\')">' + c.category + ' (' + c.count + ')</a>';
                }).join('');
            }
          });

        loadBlogPosts(1);
      `],
    },
    {
      path: '/blog/*',
      title: 'Blog Post',
      contentRoute: '/storefront/blog-post',
      metaDescription: 'Blog post',
      styles: `
        .post-container { max-width: 760px; margin: 0 auto; padding: 2rem 1rem; }
        .post-back { color: #6b7280; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 1.5rem; font-size: 0.9rem; }
        .post-back:hover { color: #1f2937; }
        .post-cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem; }
        .post-title { font-size: 2.25rem; font-weight: 700; line-height: 1.3; margin-bottom: 1rem; }
        .post-meta { display: flex; gap: 1.5rem; color: #9ca3af; font-size: 0.9rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .post-content { font-size: 1.05rem; line-height: 1.8; color: #374151; }
        .post-content h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; }
        .post-content h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .post-content p { margin-bottom: 1.25rem; }
        .post-content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
        .post-content blockquote { border-left: 3px solid #3b82f6; padding-left: 1rem; color: #6b7280; margin: 1.5rem 0; font-style: italic; }
        .post-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        .post-content pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 8px; overflow-x: auto; }
        .post-products { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; }
        .post-products h3 { font-size: 1.25rem; margin-bottom: 1rem; }
        .post-products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .post-product-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; text-align: center; text-decoration: none; color: inherit; transition: border-color 0.2s; }
        .post-product-card:hover { border-color: #3b82f6; }
        .post-tags { margin-top: 2rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .post-tag { font-size: 0.8rem; background: #f3f4f6; color: #6b7280; padding: 4px 10px; border-radius: 16px; }
      `,
      scripts: [`
        var fc = window.FORKCART || {};
        var apiUrl = fc.apiUrl || '';
        var slug = window.location.pathname.split('/ext/blog/')[1];

        if (slug) {
          fetch(apiUrl + '/api/v1/public/plugins/blog/posts/' + slug)
            .then(function(r) { return r.json(); })
            .then(function(res) {
              var container = document.getElementById('blog-post-root');
              if (res.error) {
                container.innerHTML = '<div style="text-align:center;padding:3rem;"><h2>Beitrag nicht gefunden</h2><a href="/ext/blog" class="post-back">← Zurück zum Blog</a></div>';
                return;
              }
              var p = res.data;
              var date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : '';
              var html = '<a href="/ext/blog" class="post-back">← Zurück zum Blog</a>';
              if (p.cover_image) html += '<img src="' + p.cover_image + '" class="post-cover" alt="' + p.title + '" />';
              html += '<h1 class="post-title">' + p.title + '</h1>';
              html += '<div class="post-meta">';
              if (date) html += '<span>📅 ' + date + '</span>';
              if (p.author) html += '<span>✍️ ' + p.author + '</span>';
              if (p.reading_time_min) html += '<span>⏱️ ' + p.reading_time_min + ' min Lesezeit</span>';
              if (p.category) html += '<span>📂 ' + p.category + '</span>';
              html += '</div>';
              html += '<div class="post-content">' + (p.content || '') + '</div>';

              if (p.tags) {
                html += '<div class="post-tags">' + p.tags.split(',').map(function(t) {
                  return '<span class="post-tag">#' + t.trim() + '</span>';
                }).join('') + '</div>';
              }

              if (p.linkedProducts && p.linkedProducts.length > 0) {
                html += '<div class="post-products"><h3>🛍️ Erwähnte Produkte</h3><div class="post-products-grid">';
                html += p.linkedProducts.map(function(lp) {
                  var price = lp.price ? (lp.price / 100).toFixed(2) + ' ' + (lp.currency || 'EUR') : '';
                  return '<a href="/product/' + lp.product_slug + '" class="post-product-card"><div style="font-weight:500">' + lp.name + '</div>' + (price ? '<div style="color:#16a34a;margin-top:.5rem">' + price + '</div>' : '') + '</a>';
                }).join('') + '</div></div>';
              }

              container.innerHTML = html;
              if (p.meta_title) document.title = p.meta_title;
            });
        }
      `],
    },
  ],

  // ─── PAGEBUILDER BLOCK ──────────────────────────────

  pageBuilderBlocks: [
    {
      name: 'latest-posts',
      label: 'Neueste Blogposts',
      icon: '📝',
      category: 'Content',
      description: 'Zeigt die neuesten Blogposts als Karten',
      defaultSlot: 'footer-before',
      defaultOrder: 5,
      content: `
        <div id="fc-blog-latest" style="display:none;padding:2rem 1rem;">
          <h3 id="fc-blog-latest-title" style="font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:1.5rem;"></h3>
          <div id="fc-blog-latest-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;max-width:1100px;margin:0 auto;"></div>
        </div>
        <script>
          (function() {
            var apiUrl = (window.FORKCART || {}).apiUrl || '';
            fetch(apiUrl + '/api/v1/public/plugins/blog/posts?limit=3')
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (!res.data || res.data.length === 0) return;
                var container = document.getElementById('fc-blog-latest');
                document.getElementById('fc-blog-latest-title').textContent = 'Aus unserem Blog';
                document.getElementById('fc-blog-latest-grid').innerHTML = res.data.map(function(p) {
                  var date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : '';
                  return '<a href="/ext/blog/' + p.slug + '" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .2s;">'
                    + (p.cover_image ? '<img src="' + p.cover_image + '" style="width:100%;height:160px;object-fit:cover;" loading="lazy" />' : '')
                    + '<div style="padding:1rem;"><div style="font-size:.8rem;color:#9ca3af;margin-bottom:.5rem;">' + date + '</div>'
                    + '<div style="font-weight:600;margin-bottom:.5rem;">' + p.title + '</div>'
                    + '<div style="font-size:.85rem;color:#6b7280;">' + (p.excerpt || '').substring(0, 120) + '...</div></div></a>';
                }).join('');
                container.style.display = 'block';
              });
          })();
        </script>
      `,
    },
  ],

  // ─── DATABASE MIGRATIONS ────────────────────────────

  migrations: [
    {
      version: '1.0.0',
      description: 'Create blog tables',
      up: async (db, helpers) => {
        const r = helpers?.ref || (() => 'UUID');

        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_blog_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            slug VARCHAR(500) NOT NULL UNIQUE,
            content TEXT DEFAULT '',
            excerpt TEXT DEFAULT '',
            cover_image TEXT,
            author VARCHAR(255),
            category VARCHAR(255),
            tags TEXT,
            status VARCHAR(20) DEFAULT 'draft',
            published_at TIMESTAMPTZ,
            meta_title VARCHAR(500),
            meta_description TEXT,
            reading_time_min INTEGER DEFAULT 1,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON plugin_blog_posts(slug);
          CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON plugin_blog_posts(status);
          CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON plugin_blog_posts(published_at);
          CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON plugin_blog_posts(category);
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_blog_product_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES plugin_blog_posts(id) ON DELETE CASCADE,
            product_id ${r('products.id')} NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(post_id, product_id)
          );

          CREATE INDEX IF NOT EXISTS idx_blog_product_links_post ON plugin_blog_product_links(post_id);
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS plugin_blog_product_links;');
        await db.execute('DROP TABLE IF EXISTS plugin_blog_posts;');
      },
    },
  ],

  // ─── CLI COMMANDS ───────────────────────────────────

  cli: [
    {
      name: 'stats',
      description: 'Show blog statistics',
      handler: async (args, ctx) => {
        const result = await ctx.db.execute(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'published') as published,
            COUNT(*) FILTER (WHERE status = 'draft') as drafts,
            COALESCE(SUM(views), 0) as views
          FROM plugin_blog_posts
        `);
        const s = result.rows?.[0] || {};
        ctx.logger.info('📝 Blog Stats:');
        ctx.logger.info(`  Total: ${s.total} | Published: ${s.published} | Drafts: ${s.drafts} | Views: ${s.views}`);
      },
    },
    {
      name: 'publish',
      description: 'Publish a draft post',
      args: [{ name: 'slug', description: 'Post slug to publish', required: true }],
      handler: async (args, ctx) => {
        await ctx.db.execute(
          `UPDATE plugin_blog_posts SET status = 'published', published_at = NOW() WHERE slug = $1 AND status = 'draft'`,
          [args.slug]
        );
        ctx.logger.info(`✅ Published: ${args.slug}`);
      },
    },
    {
      name: 'list',
      description: 'List all blog posts',
      options: [
        { name: 'status', alias: 's', description: 'Filter by status', type: 'string', default: '' },
      ],
      handler: async (args, ctx) => {
        let query = 'SELECT title, slug, status, views, published_at FROM plugin_blog_posts';
        const params: any[] = [];
        if (args.status) {
          query += ' WHERE status = $1';
          params.push(args.status);
        }
        query += ' ORDER BY created_at DESC';
        const result = await ctx.db.execute(query, params);
        (result.rows || []).forEach((p: any) => {
          const date = p.published_at ? new Date(p.published_at).toLocaleDateString('de-DE') : 'n/a';
          ctx.logger.info(`  [${p.status}] ${p.title} (/${p.slug}) — ${p.views} views — ${date}`);
        });
      },
    },
  ],

  // ─── SCHEDULED TASKS ────────────────────────────────

  scheduledTasks: [
    {
      name: 'publish-scheduled',
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: true,
      handler: async (ctx) => {
        const result = await ctx.db.execute(
          `UPDATE plugin_blog_posts
           SET status = 'published'
           WHERE status = 'scheduled' AND published_at <= NOW()
           RETURNING title, slug`
        );
        if (result.rows && result.rows.length > 0) {
          ctx.logger.info(`📝 Published ${result.rows.length} scheduled posts:`,
            result.rows.map((r: any) => r.title));
        }
      },
    },
  ],

  // ─── ADMIN PAGES ────────────────────────────────────

  adminPages: [
    {
      path: '/blog',
      label: 'Blog',
      icon: 'file-text',
      order: 30,
      apiRoute: '/admin/dashboard',
    },
  ],

  // ─── LIFECYCLE ──────────────────────────────────────

  onInstall: async (ctx) => {
    ctx.logger.info('📝 Blog plugin installed!');
  },

  onActivate: async (ctx) => {
    ctx.logger.info('Blog activated — storefront pages live at /ext/blog');
  },

  onReady: async (ctx) => {
    ctx.logger.info('Blog plugin ready');
    // Check for scheduled posts on startup
    const pending = await ctx.db.execute(
      `SELECT COUNT(*) as count FROM plugin_blog_posts WHERE status = 'scheduled' AND published_at <= NOW()`
    );
    const count = parseInt(pending.rows?.[0]?.count || '0');
    if (count > 0) {
      ctx.logger.info(`Found ${count} scheduled posts ready to publish`);
    }
  },

  onError: async (error, source, ctx) => {
    ctx.logger.error(`Blog plugin error in ${source.type}:${source.name}: ${error.message}`);
  },

  onDeactivate: async (ctx) => {
    ctx.logger.info('Blog deactivated — data preserved.');
  },
});
