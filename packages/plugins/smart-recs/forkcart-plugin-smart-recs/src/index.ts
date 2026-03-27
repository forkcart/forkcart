import { definePlugin } from '@forkcart/plugin-sdk';

/**
 * ForkCart Smart Recommendations Plugin
 *
 * Link related products on product pages as recommendations.
 * Manual curation + auto-detection from order data.
 *
 * Features:
 * - Manual product linking via Admin UI
 * - "Frequently bought together" auto-tracking
 * - PageBuilder block with fallback
 * - Admin page with live dashboard (content + apiRoute)
 * - CLI for bulk operations
 *
 * @author Tyto 🦉
 * @version 1.0.0
 */

export default definePlugin({
  name: 'smart-recs',
  version: '1.0.0',
  type: 'general',
  description:
    'Show smart product recommendations — manual picks and auto-detected from purchase patterns',
  author: 'Tyto 🦉',
  keywords: [
    'recommendations',
    'related-products',
    'cross-sell',
    'upsell',
    'frequently-bought-together',
  ],

  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable Recommendations',
      default: true,
      description: 'Show recommendation widgets on product pages',
    },
    maxRecommendations: {
      type: 'number',
      label: 'Max Recommendations',
      default: 4,
      min: 1,
      max: 12,
      description: 'Maximum number of recommended products to show',
    },
    showFrequentlyBought: {
      type: 'boolean',
      label: 'Show "Frequently Bought Together"',
      default: true,
      description: 'Auto-detect products often purchased together',
    },
    widgetTitle: {
      type: 'string',
      label: 'Widget Title',
      default: 'You might also like',
      placeholder: 'Recommended for you...',
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: ['grid', 'carousel', 'list'],
      default: 'grid',
    },
  },

  permissions: ['products:read', 'orders:read'],

  // === EVENT HOOKS ===

  hooks: {
    // Track co-purchases for "frequently bought together"
    'order:paid': async (event, ctx) => {
      const { items } = event.payload;
      if (!items || items.length < 2) return;

      ctx.logger.info('Tracking co-purchases', { itemCount: items.length });

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const productA = items[i].productId;
          const productB = items[j].productId;
          const [first, second] = productA < productB ? [productA, productB] : [productB, productA];

          try {
            await ctx.db.execute(
              `INSERT INTO plugin_smart_recs_copurchases (product_a_id, product_b_id, count, last_purchased_at)
               VALUES ($1, $2, 1, NOW())
               ON CONFLICT (product_a_id, product_b_id)
               DO UPDATE SET count = plugin_smart_recs_copurchases.count + 1, last_purchased_at = NOW()`,
              [first, second],
            );
          } catch (err) {
            ctx.logger.error('Failed to track co-purchase', { error: err });
          }
        }
      }
    },
  },

  // === CUSTOM API ROUTES ===

  routes: (router) => {
    // Get recommendations for a product (public)
    router.get('/for/:productId', async (c) => {
      const productId = c.req.param('productId');
      const db = c.get('db');
      const settings = c.get('pluginSettings');
      const max = (settings?.maxRecommendations as number) || 4;

      // 1. Manual recommendations
      const manual = await db.execute(
        `SELECT recommended_product_id, sort_order, label
         FROM plugin_smart_recs_manual
         WHERE source_product_id = $1
         ORDER BY sort_order ASC
         LIMIT $2`,
        [productId, max],
      );

      const manualIds = (manual.rows || []).map((r: any) => r.recommended_product_id);

      // 2. Auto-fill from co-purchases
      let autoIds: string[] = [];
      if (settings?.showFrequentlyBought && manualIds.length < max) {
        const remaining = max - manualIds.length;

        // Build exclude clause
        const excludePlaceholders =
          manualIds.length > 0
            ? manualIds.map((_: any, i: number) => `$${i + 3}`).join(', ')
            : "''";
        const params: any[] = [productId, remaining, ...manualIds];

        const auto = await db.execute(
          `SELECT
             CASE WHEN product_a_id = $1 THEN product_b_id ELSE product_a_id END as product_id,
             count
           FROM plugin_smart_recs_copurchases
           WHERE (product_a_id = $1 OR product_b_id = $1)
             AND CASE WHEN product_a_id = $1 THEN product_b_id ELSE product_a_id END NOT IN (${excludePlaceholders})
           ORDER BY count DESC
           LIMIT $2`,
          params,
        );

        autoIds = (auto.rows || []).map((r: any) => r.product_id);
      }

      return c.json({
        productId,
        manual: manual.rows || [],
        auto: autoIds,
        allIds: [...manualIds, ...autoIds],
      });
    });

    // Admin: Set manual recommendations
    router.post('/manage/:productId', async (c) => {
      const productId = c.req.param('productId');
      const { recommendations } = await c.req.json();
      const db = c.get('db');
      const logger = c.get('logger');

      if (!Array.isArray(recommendations)) {
        return c.json({ error: 'recommendations must be an array' }, 400);
      }

      await db.execute('DELETE FROM plugin_smart_recs_manual WHERE source_product_id = $1', [
        productId,
      ]);

      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        await db.execute(
          `INSERT INTO plugin_smart_recs_manual (source_product_id, recommended_product_id, sort_order, label)
           VALUES ($1, $2, $3, $4)`,
          [productId, rec.productId, rec.sortOrder ?? i, rec.label ?? null],
        );
      }

      logger.info('Updated recommendations', { productId, count: recommendations.length });
      return c.json({ ok: true, count: recommendations.length });
    });

    // Admin: Delete a single recommendation
    router.delete('/manage/:sourceId/:targetId', async (c) => {
      const sourceId = c.req.param('sourceId');
      const targetId = c.req.param('targetId');
      const db = c.get('db');

      await db.execute(
        'DELETE FROM plugin_smart_recs_manual WHERE source_product_id = $1 AND recommended_product_id = $2',
        [sourceId, targetId],
      );

      return c.json({ ok: true });
    });

    // Admin: Overview stats
    router.get('/overview', async (c) => {
      const db = c.get('db');

      const manualStats = await db.execute(
        `SELECT COUNT(DISTINCT source_product_id) as products_with_recs,
                COUNT(*) as total_recs
         FROM plugin_smart_recs_manual`,
      );

      const autoStats = await db.execute(
        `SELECT COUNT(*) as total_pairs,
                COALESCE(SUM(count), 0) as total_copurchases
         FROM plugin_smart_recs_copurchases`,
      );

      const topPairs = await db.execute(
        `SELECT product_a_id, product_b_id, count
         FROM plugin_smart_recs_copurchases
         ORDER BY count DESC
         LIMIT 10`,
      );

      return c.json({
        manual: manualStats.rows?.[0] || { products_with_recs: 0, total_recs: 0 },
        auto: autoStats.rows?.[0] || { total_pairs: 0, total_copurchases: 0 },
        topPairs: topPairs.rows || [],
      });
    });

    // Dynamic admin page content
    router.get('/admin/dashboard', async (c) => {
      const db = c.get('db');

      const manualStats = await db.execute(
        `SELECT COUNT(DISTINCT source_product_id) as products, COUNT(*) as total
         FROM plugin_smart_recs_manual`,
      );

      const autoStats = await db.execute(
        `SELECT COUNT(*) as pairs, COALESCE(SUM(count), 0) as purchases
         FROM plugin_smart_recs_copurchases`,
      );

      const m = manualStats.rows?.[0] || { products: 0, total: 0 };
      const a = autoStats.rows?.[0] || { pairs: 0, purchases: 0 };

      return c.json({
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 800px;">
            <h2 style="margin-bottom: 1.5rem;">🛍️ Smart Recommendations Dashboard</h2>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.5rem;">
                <div style="font-size: 2rem; font-weight: 700; color: #16a34a;">${m.total}</div>
                <div style="color: #4b5563;">Manual Recommendations</div>
                <div style="color: #9ca3af; font-size: 0.875rem;">${m.products} products configured</div>
              </div>
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.5rem;">
                <div style="font-size: 2rem; font-weight: 700; color: #2563eb;">${a.pairs}</div>
                <div style="color: #4b5563;">Auto-Detected Pairs</div>
                <div style="color: #9ca3af; font-size: 0.875rem;">${a.purchases} co-purchases tracked</div>
              </div>
            </div>

            <h3>How It Works</h3>
            <ul style="line-height: 1.8; color: #4b5563;">
              <li><strong>Manual:</strong> Use the API or CLI to link related products</li>
              <li><strong>Auto:</strong> The plugin tracks which products are bought together</li>
              <li><strong>Display:</strong> Manual picks show first, auto-detected fill remaining slots</li>
            </ul>

            <h3 style="margin-top: 1.5rem;">Quick Actions</h3>
            <p style="color: #6b7280;">
              Use the CLI: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">forkcart plugin run smart-recs:stats</code>
            </p>
          </div>
        `,
      });
    });
  },

  // === PAGEBUILDER BLOCK ===

  pageBuilderBlocks: [
    {
      name: 'recommendations-widget',
      label: 'Product Recommendations',
      icon: '🛍️',
      category: 'Sales',
      description: 'Shows recommended products based on manual picks and purchase patterns',
      defaultSlot: 'product-page-bottom',
      defaultOrder: 10,
      pages: ['/product/*'],
      content: `
        <div id="fc-smart-recs" class="fc-smart-recs" style="display:none;">
          <h3 class="fc-smart-recs-title"></h3>
          <div class="fc-smart-recs-grid"></div>
        </div>
        <style>
          .fc-smart-recs {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #fafafa;
            border-radius: 12px;
          }
          .fc-smart-recs-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #1a1a1a;
          }
          .fc-smart-recs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
          }
          .fc-smart-recs-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
          }
          .fc-smart-recs-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .fc-smart-recs-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
          }
          .fc-smart-recs-info {
            padding: 0.75rem;
          }
          .fc-smart-recs-name {
            font-weight: 500;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
          }
          .fc-smart-recs-price {
            color: #16a34a;
            font-weight: 600;
          }
          .fc-smart-recs-label {
            font-size: 0.75rem;
            color: #6b7280;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 0.5rem;
            display: inline-block;
          }
          @media (max-width: 640px) {
            .fc-smart-recs-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>
        <script>
          (function() {
            var productId = window.FORKCART?.productId;
            var apiUrl = window.FORKCART?.apiUrl || '';
            if (!productId) return;

            var widget = document.getElementById('fc-smart-recs');
            var titleEl = widget.querySelector('.fc-smart-recs-title');
            var gridEl = widget.querySelector('.fc-smart-recs-grid');

            var settings = window.FORKCART?.pluginSettings?.['smart-recs'] || {};
            titleEl.textContent = settings.widgetTitle || 'You might also like';

            fetch(apiUrl + '/api/v1/public/plugins/smart-recs/for/' + productId)
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (!data.allIds || data.allIds.length === 0) return;

                var labelMap = {};
                (data.manual || []).forEach(function(m) {
                  if (m.label) labelMap[m.recommended_product_id] = m.label;
                });

                Promise.all(
                  data.allIds.map(function(id) {
                    return fetch(apiUrl + '/api/v1/public/products/' + id)
                      .then(function(r) { return r.ok ? r.json() : null; })
                      .catch(function() { return null; });
                  })
                ).then(function(products) {
                  var valid = products.filter(Boolean);
                  if (valid.length === 0) return;

                  gridEl.innerHTML = valid.map(function(p) {
                    var img = p.images?.[0]?.url || p.image || '';
                    var price = p.price ? (p.price / 100).toFixed(2) : '';
                    var currency = p.currency || 'EUR';
                    var label = labelMap[p.id] || '';
                    var slug = p.slug || p.id;

                    return '<a href="/product/' + slug + '" class="fc-smart-recs-card">'
                      + (img ? '<img src="' + img + '" alt="' + (p.name || '') + '" loading="lazy" />' : '')
                      + '<div class="fc-smart-recs-info">'
                      + (label ? '<span class="fc-smart-recs-label">' + label + '</span>' : '')
                      + '<div class="fc-smart-recs-name">' + (p.name || 'Product') + '</div>'
                      + (price ? '<div class="fc-smart-recs-price">' + price + ' ' + currency + '</div>' : '')
                      + '</div></a>';
                  }).join('');

                  widget.style.display = 'block';
                });
              })
              .catch(function(err) { console.error('Smart recs error:', err); });
          })();
        </script>
      `,
    },
  ],

  // === DATABASE MIGRATIONS ===

  migrations: [
    {
      version: '1.0.0',
      description: 'Create smart recommendations tables',
      up: async (db) => {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_smart_recs_manual (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_product_id VARCHAR(255) NOT NULL,
            recommended_product_id VARCHAR(255) NOT NULL,
            sort_order INTEGER DEFAULT 0,
            label VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(source_product_id, recommended_product_id)
          );

          CREATE INDEX IF NOT EXISTS idx_smart_recs_manual_source
          ON plugin_smart_recs_manual(source_product_id);
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_smart_recs_copurchases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_a_id VARCHAR(255) NOT NULL,
            product_b_id VARCHAR(255) NOT NULL,
            count INTEGER DEFAULT 1,
            last_purchased_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_a_id, product_b_id)
          );

          CREATE INDEX IF NOT EXISTS idx_smart_recs_copa
          ON plugin_smart_recs_copurchases(product_a_id);

          CREATE INDEX IF NOT EXISTS idx_smart_recs_copb
          ON plugin_smart_recs_copurchases(product_b_id);
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS plugin_smart_recs_copurchases;');
        await db.execute('DROP TABLE IF EXISTS plugin_smart_recs_manual;');
      },
    },
  ],

  // === CLI COMMANDS ===

  cli: [
    {
      name: 'stats',
      description: 'Show recommendation statistics',
      handler: async (args, ctx) => {
        const manual = await ctx.db.execute(
          'SELECT COUNT(DISTINCT source_product_id) as products, COUNT(*) as total FROM plugin_smart_recs_manual',
        );
        const auto = await ctx.db.execute(
          'SELECT COUNT(*) as pairs, COALESCE(SUM(count), 0) as total FROM plugin_smart_recs_copurchases',
        );

        ctx.logger.info('📊 Smart Recommendations Stats:');
        ctx.logger.info(
          `  Manual: ${manual.rows?.[0]?.total || 0} recs across ${manual.rows?.[0]?.products || 0} products`,
        );
        ctx.logger.info(
          `  Auto: ${auto.rows?.[0]?.pairs || 0} product pairs, ${auto.rows?.[0]?.total || 0} co-purchases tracked`,
        );
      },
    },
    {
      name: 'add',
      description: 'Add a manual recommendation',
      args: [
        { name: 'sourceId', description: 'Source product ID', required: true },
        { name: 'targetId', description: 'Recommended product ID', required: true },
      ],
      options: [
        {
          name: 'label',
          alias: 'l',
          description: 'Label (e.g. "Perfect match")',
          type: 'string',
          default: '',
        },
      ],
      handler: async (args, ctx) => {
        await ctx.db.execute(
          `INSERT INTO plugin_smart_recs_manual (source_product_id, recommended_product_id, label)
           VALUES ($1, $2, $3)
           ON CONFLICT (source_product_id, recommended_product_id) DO UPDATE SET label = $3`,
          [args.sourceId, args.targetId, args.label || null],
        );
        ctx.logger.info(`✅ Added: ${args.sourceId} → ${args.targetId}`);
      },
    },
    {
      name: 'clear',
      description: 'Clear all recommendations for a product',
      args: [{ name: 'productId', description: 'Product ID to clear', required: true }],
      options: [
        {
          name: 'confirm',
          alias: 'y',
          description: 'Skip confirmation',
          type: 'boolean',
          default: false,
        },
      ],
      handler: async (args, ctx) => {
        if (!args.confirm) {
          ctx.logger.warn('Use --confirm to proceed.');
          return;
        }
        await ctx.db.execute('DELETE FROM plugin_smart_recs_manual WHERE source_product_id = $1', [
          args.productId,
        ]);
        ctx.logger.info(`🗑️ Cleared recommendations for ${args.productId}`);
      },
    },
  ],

  // === ADMIN PAGES ===

  adminPages: [
    {
      path: '/recommendations',
      label: 'Recommendations',
      icon: 'link',
      order: 45,
      apiRoute: '/admin/dashboard',
    },
  ],

  // === LIFECYCLE ===

  onInstall: async (ctx) => {
    ctx.logger.info('🛍️ Smart Recommendations installed!');
  },

  onActivate: async (ctx) => {
    ctx.logger.info('Smart Recommendations activated — widget live on product pages.');
  },

  onDeactivate: async (ctx) => {
    ctx.logger.info('Smart Recommendations deactivated — data preserved.');
  },
});
