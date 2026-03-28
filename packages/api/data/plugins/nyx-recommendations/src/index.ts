import { definePlugin, ref } from '@forkcart/plugin-sdk';

/**
 * Nyx Recommendations — Smart product recommendations for ForkCart.
 *
 * Built by Nyx 🦞 using the ForkCart Plugin SDK.
 * Uses ref() for type-safe column references. No UUID/VARCHAR drama.
 *
 * @author Nyx 🦞
 * @version 1.0.0
 */
export default definePlugin({
  name: 'nyx-recommendations',
  version: '1.0.0',
  type: 'general',
  description:
    'AI-powered product recommendations with smart scoring, trending detection, and beautiful widgets. 🦞',
  author: 'Nyx 🦞',
  keywords: ['recommendations', 'ai', 'cross-sell', 'upsell', 'trending'],
  minVersion: '0.1.0',

  // ═══ SETTINGS ═══════════════════════════════════════════════════════════

  settings: {
    maxRecommendations: {
      type: 'number',
      label: 'Max Recommendations',
      default: 6,
      min: 1,
      max: 20,
      description: 'Maximum products to show in the widget',
    },
    widgetTitle: {
      type: 'string',
      label: 'Widget Title',
      default: 'Recommended for you',
      placeholder: 'You might also like...',
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['grid', 'carousel', 'compact'],
      default: 'grid',
    },
    showTrending: {
      type: 'boolean',
      label: 'Show Trending Badge',
      default: true,
      description: 'Highlight products with rising purchase velocity 🔥',
    },
    trackClicks: {
      type: 'boolean',
      label: 'Track Clicks',
      default: true,
      description: 'Record when users click recommendations (for analytics)',
    },
    categoryBoost: {
      type: 'number',
      label: 'Category Boost',
      default: 1.5,
      min: 1.0,
      max: 5.0,
      description: 'Score multiplier for products in the same category',
    },
  },

  permissions: ['products:read', 'orders:read'],

  // ═══ EVENT HOOKS ════════════════════════════════════════════════════════

  hooks: {
    'order:paid': async (event, ctx) => {
      const { items } = event.payload as any;
      if (!items || items.length < 2) return;

      ctx.logger.info('Tracking co-purchases', { itemCount: items.length });

      // Track every pair of products bought together
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].productId;
          const b = items[j].productId;
          const [first, second] = a < b ? [a, b] : [b, a];

          try {
            await (ctx.db as any).execute(
              `INSERT INTO plugin_nyx_recommendations_pairs (product_a, product_b, frequency, last_purchased)
               VALUES ($1, $2, 1, NOW())
               ON CONFLICT (product_a, product_b)
               DO UPDATE SET
                 frequency = plugin_nyx_recommendations_pairs.frequency + 1,
                 last_purchased = NOW()`,
              [first, second],
            );
          } catch (err) {
            ctx.logger.error('Failed to track co-purchase', { error: err });
          }
        }
      }
    },
  },

  // ═══ ERROR HANDLER ══════════════════════════════════════════════════════

  onError: async (error, source, ctx) => {
    ctx.logger.error(`[nyx-recs] Error in ${source.type}:${source.name}: ${error.message}`);
  },

  // ═══ ON READY (server startup) ══════════════════════════════════════════

  onReady: async (ctx) => {
    ctx.logger.info('🦞 Nyx Recommendations ready!');
  },

  // ═══ CUSTOM API ROUTES ══════════════════════════════════════════════════

  routes: (router) => {
    // ─── GET /for/:productId — Recommendations for a product ──────────

    router.get('/for/:productId', async (c: any) => {
      const productId = c.req.param('productId');
      const db = c.get('db');
      const settings = c.get('pluginSettings') || {};
      const max = (settings.maxRecommendations as number) || 6;
      const categoryBoost = (settings.categoryBoost as number) || 1.5;

      // 1. Manual recommendations (highest priority)
      const manual = await db.execute(
        `SELECT m.target_product, m.sort_order, m.label,
                p.name, p.slug, p.price, p.currency, p.category_id
         FROM plugin_nyx_recommendations_manual m
         LEFT JOIN products p ON p.id::text = m.target_product
         WHERE m.source_product = $1
         ORDER BY m.sort_order ASC
         LIMIT $2`,
        [productId, max],
      );

      const manualIds = (manual.rows || []).map((r: any) => r.target_product);

      // 2. Smart-scored co-purchases (fill remaining slots)
      let autoRecs: any[] = [];
      if (manualIds.length < max) {
        const remaining = max - manualIds.length;

        // Get source product's category for boosting
        const srcProduct = await db.execute(
          `SELECT category_id FROM products WHERE id::text = $1`,
          [productId],
        );
        const srcCategory = srcProduct.rows?.[0]?.category_id;

        // Score = frequency × recency_weight × category_bonus
        const excludeList =
          manualIds.length > 0
            ? manualIds.map((_: any, i: number) => `$${i + 4}`).join(', ')
            : "''";
        const params: any[] = [productId, productId, remaining, ...manualIds];

        const auto = await db.execute(
          `SELECT
             CASE WHEN pr.product_a = $1 THEN pr.product_b ELSE pr.product_a END as product_id,
             pr.frequency,
             pr.last_purchased,
             p.name, p.slug, p.price, p.currency, p.category_id,
             -- Smart score: frequency × recency × category bonus
             pr.frequency *
               (1.0 / (1 + EXTRACT(EPOCH FROM (NOW() - pr.last_purchased)) / 86400)) *
               CASE WHEN p.category_id IS NOT NULL AND p.category_id::text = $${manualIds.length + 4}
                    THEN ${categoryBoost} ELSE 1.0 END
             as score
           FROM plugin_nyx_recommendations_pairs pr
           LEFT JOIN products p ON p.id::text = CASE WHEN pr.product_a = $1 THEN pr.product_b ELSE pr.product_a END
           WHERE (pr.product_a = $1 OR pr.product_b = $2)
             AND CASE WHEN pr.product_a = $1 THEN pr.product_b ELSE pr.product_a END NOT IN (${excludeList})
           ORDER BY score DESC
           LIMIT $3`,
          [...params, srcCategory || ''],
        );

        autoRecs = auto.rows || [];
      }

      // 3. Category fallback (if still not enough)
      let fallbackRecs: any[] = [];
      const totalSoFar = manualIds.length + autoRecs.length;
      if (totalSoFar < max) {
        const fallbackLimit = max - totalSoFar;
        const allExclude = [...manualIds, ...autoRecs.map((r: any) => r.product_id), productId];
        const excludePlaceholders = allExclude.map((_: any, i: number) => `$${i + 2}`).join(', ');

        const fallback = await db.execute(
          `SELECT p.id as product_id, p.name, p.slug, p.price, p.currency, p.category_id
           FROM products p
           WHERE p.category_id = (SELECT category_id FROM products WHERE id::text = $1)
             AND p.id::text NOT IN (${excludePlaceholders})
             AND p.status = 'active'
           ORDER BY p.created_at DESC
           LIMIT ${fallbackLimit}`,
          [productId, ...allExclude],
        );

        fallbackRecs = (fallback.rows || []).map((r: any) => ({ ...r, source: 'category' }));
      }

      return c.json({
        productId,
        recommendations: [
          ...(manual.rows || []).map((r: any) => ({
            productId: r.target_product,
            name: r.name,
            slug: r.slug,
            price: r.price,
            currency: r.currency,
            label: r.label,
            source: 'manual',
          })),
          ...autoRecs.map((r: any) => ({
            productId: r.product_id,
            name: r.name,
            slug: r.slug,
            price: r.price,
            currency: r.currency,
            score: parseFloat(r.score),
            frequency: r.frequency,
            source: 'smart',
          })),
          ...fallbackRecs.map((r: any) => ({
            productId: r.product_id,
            name: r.name,
            slug: r.slug,
            price: r.price,
            currency: r.currency,
            source: 'category',
          })),
        ],
        total: manualIds.length + autoRecs.length + fallbackRecs.length,
      });
    });

    // ─── GET /trending — Products with rising purchase velocity ────────

    router.get('/trending', async (c: any) => {
      const db = c.get('db');

      const trending = await db.execute(
        `SELECT
           product_id,
           SUM(frequency) as total_purchases,
           COUNT(*) as pair_count,
           MAX(last_purchased) as last_seen,
           p.name, p.slug, p.price, p.currency
         FROM (
           SELECT product_a as product_id, frequency, last_purchased
           FROM plugin_nyx_recommendations_pairs
           WHERE last_purchased > NOW() - INTERVAL '48 hours'
           UNION ALL
           SELECT product_b as product_id, frequency, last_purchased
           FROM plugin_nyx_recommendations_pairs
           WHERE last_purchased > NOW() - INTERVAL '48 hours'
         ) recent
         LEFT JOIN products p ON p.id::text = recent.product_id
         GROUP BY product_id, p.name, p.slug, p.price, p.currency
         HAVING SUM(frequency) >= 3
         ORDER BY total_purchases DESC
         LIMIT 10`,
      );

      return c.json({
        trending: (trending.rows || []).map((r: any) => ({
          productId: r.product_id,
          name: r.name,
          slug: r.slug,
          price: r.price,
          currency: r.currency,
          purchases: parseInt(r.total_purchases),
          pairCount: parseInt(r.pair_count),
          lastSeen: r.last_seen,
        })),
      });
    });

    // ─── POST /click — Track recommendation click ─────────────────────

    router.post('/click', async (c: any) => {
      const db = c.get('db');
      const settings = c.get('pluginSettings') || {};
      if (!settings.trackClicks) return c.json({ ok: true, tracked: false });

      const { sourceProduct, clickedProduct, source } = await c.req.json();
      if (!sourceProduct || !clickedProduct) {
        return c.json({ error: 'sourceProduct and clickedProduct required' }, 400);
      }

      await db.execute(
        `INSERT INTO plugin_nyx_recommendations_clicks
         (source_product, clicked_product, rec_source, clicked_at)
         VALUES ($1, $2, $3, NOW())`,
        [sourceProduct, clickedProduct, source || 'unknown'],
      );

      return c.json({ ok: true, tracked: true });
    });

    // ─── GET /overview — Admin dashboard stats ────────────────────────

    router.get('/overview', async (c: any) => {
      const db = c.get('db');

      const manualStats = await db.execute(
        `SELECT COUNT(DISTINCT source_product) as products, COUNT(*) as total
         FROM plugin_nyx_recommendations_manual`,
      );

      const pairStats = await db.execute(
        `SELECT COUNT(*) as pairs, COALESCE(SUM(frequency), 0) as purchases
         FROM plugin_nyx_recommendations_pairs`,
      );

      const clickStats = await db.execute(
        `SELECT COUNT(*) as total_clicks,
                COUNT(DISTINCT source_product) as products_with_clicks,
                COUNT(DISTINCT clicked_product) as products_clicked
         FROM plugin_nyx_recommendations_clicks`,
      );

      const trendingCount = await db.execute(
        `SELECT COUNT(DISTINCT product_id) as count FROM (
           SELECT product_a as product_id FROM plugin_nyx_recommendations_pairs
           WHERE last_purchased > NOW() - INTERVAL '48 hours'
           UNION SELECT product_b FROM plugin_nyx_recommendations_pairs
           WHERE last_purchased > NOW() - INTERVAL '48 hours'
         ) t`,
      );

      const topClicked = await db.execute(
        `SELECT clicked_product, COUNT(*) as clicks, p.name
         FROM plugin_nyx_recommendations_clicks c
         LEFT JOIN products p ON p.id::text = c.clicked_product
         GROUP BY clicked_product, p.name
         ORDER BY clicks DESC LIMIT 5`,
      );

      const m = manualStats.rows?.[0] || { products: 0, total: 0 };
      const p = pairStats.rows?.[0] || { pairs: 0, purchases: 0 };
      const cl = clickStats.rows?.[0] || { total_clicks: 0 };
      const tr = trendingCount.rows?.[0] || { count: 0 };

      return c.json({
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;">
            <style>
              .nyx-stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem; text-align:center; }
              .nyx-stat-value { font-size:2rem; font-weight:700; }
              .nyx-stat-label { color:#64748b; font-size:0.875rem; margin-top:0.25rem; }
            </style>

            <p style="color:#64748b;margin-bottom:1.5rem;">Built by Nyx 🦞 — AI-powered recommendations with smart scoring</p>

            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:2rem;">
              <div class="nyx-stat">
                <div class="nyx-stat-value" style="color:#16a34a;">${m.total}</div>
                <div class="nyx-stat-label">Manual Recs</div>
              </div>
              <div class="nyx-stat">
                <div class="nyx-stat-value" style="color:#2563eb;">${p.pairs}</div>
                <div class="nyx-stat-label">Auto Pairs</div>
              </div>
              <div class="nyx-stat">
                <div class="nyx-stat-value" style="color:#f59e0b;">🔥 ${tr.count}</div>
                <div class="nyx-stat-label">Trending Now</div>
              </div>
              <div class="nyx-stat">
                <div class="nyx-stat-value" style="color:#8b5cf6;">${cl.total_clicks}</div>
                <div class="nyx-stat-label">Total Clicks</div>
              </div>
            </div>

            ${
              (topClicked.rows || []).length > 0
                ? `
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;margin-bottom:1rem;">
              <h3 style="margin-top:0;">🏆 Most Clicked Recommendations</h3>
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr>
                  <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:0.8rem;">Product</th>
                  <th style="text-align:right;padding:8px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:0.8rem;">Clicks</th>
                </tr></thead>
                <tbody>
                  ${(topClicked.rows || [])
                    .map(
                      (r: any) => `
                    <tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;">${r.name || r.clicked_product}</td>
                    <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${r.clicks}</td></tr>
                  `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
            `
                : '<p style="color:#9ca3af;text-align:center;padding:2rem;">No clicks tracked yet. Recommendations will appear once customers start shopping!</p>'
            }
          </div>
        `,
      });
    });

    // ─── POST /manage/:productId — Set manual recommendations ─────────

    router.post('/manage/:productId', async (c: any) => {
      const productId = c.req.param('productId');
      const { recommendations } = await c.req.json();
      const db = c.get('db');

      if (!Array.isArray(recommendations)) {
        return c.json({ error: 'recommendations must be an array' }, 400);
      }

      await db.execute('DELETE FROM plugin_nyx_recommendations_manual WHERE source_product = $1', [
        productId,
      ]);

      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        await db.execute(
          `INSERT INTO plugin_nyx_recommendations_manual (source_product, target_product, sort_order, label)
           VALUES ($1, $2, $3, $4)`,
          [productId, rec.productId, rec.sortOrder ?? i, rec.label ?? null],
        );
      }

      return c.json({ ok: true, count: recommendations.length });
    });

    // ─── Admin dashboard route ────────────────────────────────────────

    router.get('/admin/dashboard', async (c: any) => {
      // Reuse overview but return as admin page content
      const db = c.get('db');
      const overviewUrl = c.req.url.replace('/admin/dashboard', '/overview');
      // Self-call the overview endpoint logic
      const manualStats = await db.execute(
        `SELECT COUNT(DISTINCT source_product) as products, COUNT(*) as total
         FROM plugin_nyx_recommendations_manual`,
      );
      const pairStats = await db.execute(
        `SELECT COUNT(*) as pairs, COALESCE(SUM(frequency), 0) as purchases
         FROM plugin_nyx_recommendations_pairs`,
      );
      const clickStats = await db.execute(
        `SELECT COUNT(*) as total_clicks FROM plugin_nyx_recommendations_clicks`,
      );
      const trendingCount = await db.execute(
        `SELECT COUNT(DISTINCT product_id) as count FROM (
           SELECT product_a as product_id FROM plugin_nyx_recommendations_pairs WHERE last_purchased > NOW() - INTERVAL '48 hours'
           UNION SELECT product_b FROM plugin_nyx_recommendations_pairs WHERE last_purchased > NOW() - INTERVAL '48 hours'
         ) t`,
      );

      const m = manualStats.rows?.[0] || { products: 0, total: 0 };
      const p = pairStats.rows?.[0] || { pairs: 0, purchases: 0 };
      const cl = clickStats.rows?.[0] || { total_clicks: 0 };
      const tr = trendingCount.rows?.[0] || { count: 0 };

      return c.json({
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;">
            <style>
              .nyx-stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem; text-align:center; }
              .nyx-stat-value { font-size:2rem; font-weight:700; }
              .nyx-stat-label { color:#64748b; font-size:0.875rem; margin-top:0.25rem; }
            </style>
            <p style="color:#64748b;margin-bottom:1.5rem;">🦞 Nyx Recommendations — AI-powered smart scoring</p>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:2rem;">
              <div class="nyx-stat"><div class="nyx-stat-value" style="color:#16a34a;">${m.total}</div><div class="nyx-stat-label">Manual Recs</div></div>
              <div class="nyx-stat"><div class="nyx-stat-value" style="color:#2563eb;">${p.pairs}</div><div class="nyx-stat-label">Auto Pairs</div></div>
              <div class="nyx-stat"><div class="nyx-stat-value" style="color:#f59e0b;">🔥 ${tr.count}</div><div class="nyx-stat-label">Trending</div></div>
              <div class="nyx-stat"><div class="nyx-stat-value" style="color:#8b5cf6;">${cl.total_clicks}</div><div class="nyx-stat-label">Clicks</div></div>
            </div>
            <p style="color:#9ca3af;text-align:center;">Full management UI coming in v1.1 — for now, use the API endpoints directly.</p>
          </div>
        `,
      });
    });
  },

  // ═══ PAGEBUILDER BLOCK ══════════════════════════════════════════════════

  pageBuilderBlocks: [
    {
      name: 'nyx-recs-widget',
      label: 'Nyx Recommendations',
      icon: '🦞',
      category: 'Marketing',
      description: 'Smart product recommendations powered by purchase data',
      defaultSlot: 'product-page-bottom',
      defaultOrder: 10,
      pages: ['/product/*'],
      content: `
        <div id="nyx-recs" style="display:none;margin:2rem 0;padding:1.5rem;background:#fafafa;border-radius:12px;">
          <h3 id="nyx-recs-title" style="font-size:1.25rem;font-weight:600;margin-bottom:1rem;color:#1a1a1a;"></h3>
          <div id="nyx-recs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;"></div>
        </div>
        <style>
          .nyx-card { background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:transform 0.2s,box-shadow 0.2s; text-decoration:none; color:inherit; display:block; }
          .nyx-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.15); }
          .nyx-card img { width:100%; height:180px; object-fit:cover; }
          .nyx-info { padding:0.75rem; }
          .nyx-name { font-weight:500; font-size:0.9rem; margin-bottom:0.25rem; }
          .nyx-price { color:#16a34a; font-weight:600; }
          .nyx-badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:600; margin-bottom:0.25rem; }
          .nyx-badge-fire { background:#fef3c7; color:#d97706; }
          .nyx-badge-manual { background:#dbeafe; color:#2563eb; }
          @media (max-width:640px) { #nyx-recs-grid { grid-template-columns:repeat(2,1fr); } }
        </style>
        <script>
          (function() {
            var pid = window.FORKCART?.productId;
            var api = window.FORKCART?.apiUrl || '';
            if (!pid) return;

            var widget = document.getElementById('nyx-recs');
            var title = document.getElementById('nyx-recs-title');
            var grid = document.getElementById('nyx-recs-grid');
            var settings = window.FORKCART?.pluginSettings?.['nyx-recommendations'] || {};
            var trackClicks = settings.trackClicks !== false;

            title.textContent = settings.widgetTitle || 'Recommended for you';

            fetch(api + '/api/v1/public/plugins/nyx-recommendations/for/' + pid)
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (!data.recommendations || data.recommendations.length === 0) return;

                grid.innerHTML = data.recommendations.map(function(rec) {
                  var badge = '';
                  if (rec.source === 'manual' && rec.label) badge = '<span class="nyx-badge nyx-badge-manual">' + rec.label + '</span>';

                  var priceStr = rec.price ? (rec.price / 100).toFixed(2) + ' ' + (rec.currency || 'EUR') : '';

                  return '<a href="/product/' + (rec.slug || rec.productId) + '" class="nyx-card"'
                    + (trackClicks ? ' onclick="nyxTrack(\\'' + pid + '\\',\\'' + rec.productId + '\\',\\'' + rec.source + '\\')"' : '') + '>'
                    + '<div class="nyx-info">'
                    + badge
                    + '<div class="nyx-name">' + (rec.name || 'Product') + '</div>'
                    + (priceStr ? '<div class="nyx-price">' + priceStr + '</div>' : '')
                    + '</div></a>';
                }).join('');

                widget.style.display = 'block';
              })
              .catch(function(e) { console.error('[nyx-recs]', e); });

            window.nyxTrack = function(src, clicked, source) {
              if (!trackClicks) return;
              navigator.sendBeacon(
                api + '/api/v1/public/plugins/nyx-recommendations/click',
                JSON.stringify({ sourceProduct: src, clickedProduct: clicked, source: source })
              );
            };
          })();
        </script>
      `,
    },
  ],

  // ═══ ADMIN PAGES ════════════════════════════════════════════════════════

  adminPages: [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'bar-chart',
      order: 10,
      apiRoute: '/admin/dashboard',
    },
  ],

  // ═══ DATABASE MIGRATIONS (using ref()!) ═════════════════════════════════

  migrations: [
    {
      version: '1.0.0',
      description: 'Create Nyx Recommendations tables',
      up: async (db: any, helpers: any) => {
        const r = helpers?.ref || (() => 'UUID'); // Fallback for older ForkCart versions

        // Co-purchase pairs with smart scoring data
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_nyx_recommendations_pairs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_a ${r('products.id')} NOT NULL,
            product_b ${r('products.id')} NOT NULL,
            frequency INTEGER DEFAULT 1,
            last_purchased TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_a, product_b)
          );
          CREATE INDEX IF NOT EXISTS idx_nyx_pairs_a ON plugin_nyx_recommendations_pairs(product_a);
          CREATE INDEX IF NOT EXISTS idx_nyx_pairs_b ON plugin_nyx_recommendations_pairs(product_b);
          CREATE INDEX IF NOT EXISTS idx_nyx_pairs_recent ON plugin_nyx_recommendations_pairs(last_purchased DESC);
        `);

        // Manual curated recommendations
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_nyx_recommendations_manual (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_product ${r('products.id')} NOT NULL,
            target_product ${r('products.id')} NOT NULL,
            sort_order INTEGER DEFAULT 0,
            label VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(source_product, target_product)
          );
          CREATE INDEX IF NOT EXISTS idx_nyx_manual_source ON plugin_nyx_recommendations_manual(source_product);
        `);

        // Click tracking for analytics
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_nyx_recommendations_clicks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_product ${r('products.id')} NOT NULL,
            clicked_product ${r('products.id')} NOT NULL,
            rec_source VARCHAR(20) DEFAULT 'unknown',
            clicked_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_nyx_clicks_time ON plugin_nyx_recommendations_clicks(clicked_at DESC);
        `);
      },
      down: async (db: any) => {
        await db.execute('DROP TABLE IF EXISTS plugin_nyx_recommendations_clicks;');
        await db.execute('DROP TABLE IF EXISTS plugin_nyx_recommendations_manual;');
        await db.execute('DROP TABLE IF EXISTS plugin_nyx_recommendations_pairs;');
      },
    },
  ],

  // ═══ CLI COMMANDS ═══════════════════════════════════════════════════════

  cli: [
    {
      name: 'stats',
      description: 'Show recommendation statistics',
      handler: async (_args, ctx) => {
        const pairs = await (ctx.db as any).execute(
          'SELECT COUNT(*) as c, COALESCE(SUM(frequency),0) as f FROM plugin_nyx_recommendations_pairs',
        );
        const manual = await (ctx.db as any).execute(
          'SELECT COUNT(*) as c FROM plugin_nyx_recommendations_manual',
        );
        const clicks = await (ctx.db as any).execute(
          'SELECT COUNT(*) as c FROM plugin_nyx_recommendations_clicks',
        );
        ctx.logger.info('🦞 Nyx Recommendations Stats:');
        ctx.logger.info(
          `  Auto pairs: ${pairs.rows?.[0]?.c || 0} (${pairs.rows?.[0]?.f || 0} co-purchases)`,
        );
        ctx.logger.info(`  Manual: ${manual.rows?.[0]?.c || 0}`);
        ctx.logger.info(`  Clicks tracked: ${clicks.rows?.[0]?.c || 0}`);
      },
    },
  ],

  // ═══ SCHEDULED TASKS ════════════════════════════════════════════════════

  scheduledTasks: [
    {
      name: 'cleanup-old-clicks',
      schedule: '0 3 * * *', // Daily at 3 AM
      enabled: true,
      handler: async (ctx) => {
        const result = await (ctx.db as any).execute(
          `DELETE FROM plugin_nyx_recommendations_clicks WHERE clicked_at < NOW() - INTERVAL '90 days'`,
        );
        ctx.logger.info('🦞 Cleaned up old click data');
      },
    },
  ],

  // ═══ LIFECYCLE ══════════════════════════════════════════════════════════

  onInstall: async (ctx) => {
    ctx.logger.info(
      '🦞 Nyx Recommendations installed! Time to make some lobster-quality recommendations.',
    );
  },

  onActivate: async (ctx) => {
    ctx.logger.info('🦞 Nyx Recommendations activated — widgets live on product pages.');
  },

  onDeactivate: async (ctx) => {
    ctx.logger.info('🦞 Nyx Recommendations deactivated — data preserved for when you come back.');
  },
});
