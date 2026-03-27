import { definePlugin } from '@forkcart/plugin-sdk';

/**
 * ForkCart Product Recommendations Plugin
 *
 * Link related products on product pages as recommendations.
 * Supports manual curation and "frequently bought together" tracking.
 *
 * Features:
 * - Manual product linking (admin picks related products)
 * - "Frequently bought together" auto-detection from order data
 * - Customizable widget on product pages (PageBuilder block + slot fallback)
 * - Admin page for managing recommendations
 * - CLI for bulk operations
 *
 * @author Tyto 🦉
 * @version 1.0.0
 */

export default definePlugin({
  name: 'product-recs',
  version: '1.0.0',
  type: 'general',
  description:
    'Show product recommendations on product pages — manual picks or auto-detected from orders',
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
      description: 'Auto-detect and show products often purchased together',
    },
    widgetTitle: {
      type: 'string',
      label: 'Widget Title',
      default: 'You might also like',
      placeholder: 'Recommended for you...',
      description: 'Heading displayed above the recommendations',
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

      // For each pair of products in the order, increment co-purchase count
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const productA = items[i].productId;
          const productB = items[j].productId;

          // Always store with smaller ID first for consistency
          const [first, second] = productA < productB ? [productA, productB] : [productB, productA];

          try {
            await ctx.db.execute(
              `INSERT INTO plugin_product_recs_copurchases (product_a_id, product_b_id, count, last_purchased_at)
               VALUES ($1, $2, 1, NOW())
               ON CONFLICT (product_a_id, product_b_id)
               DO UPDATE SET count = plugin_product_recs_copurchases.count + 1, last_purchased_at = NOW()`,
              [first, second],
            );
          } catch (err) {
            ctx.logger.error('Failed to track co-purchase', { first, second, error: err });
          }
        }
      }
    },
  },

  // === CUSTOM API ROUTES ===

  routes: (router) => {
    // Get recommendations for a product
    router.get('/for/:productId', async (c) => {
      const productId = c.req.param('productId');
      const db = c.get('db');
      const settings = c.get('pluginSettings');
      const max = (settings?.maxRecommendations as number) || 4;

      // 1. Get manual recommendations
      const manual = await db.execute(
        `SELECT r.recommended_product_id, r.sort_order, r.label
         FROM plugin_product_recs_manual r
         WHERE r.source_product_id = $1
         ORDER BY r.sort_order ASC
         LIMIT $2`,
        [productId, max],
      );

      const manualIds = (manual.rows || []).map((r: any) => r.recommended_product_id);

      // 2. If "frequently bought together" enabled, fill remaining slots
      let autoIds: string[] = [];
      if (settings?.showFrequentlyBought && manualIds.length < max) {
        const remaining = max - manualIds.length;
        const excludeList =
          manualIds.length > 0
            ? manualIds.map((_: any, i: number) => `$${i + 3}`).join(', ')
            : "'__none__'";
        const params = [productId, remaining, ...manualIds];

        const auto = await db.execute(
          `SELECT
             CASE WHEN product_a_id = $1 THEN product_b_id ELSE product_a_id END as product_id,
             count
           FROM plugin_product_recs_copurchases
           WHERE (product_a_id = $1 OR product_b_id = $1)
             AND CASE WHEN product_a_id = $1 THEN product_b_id ELSE product_a_id END NOT IN (${excludeList})
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

    // Admin: Set manual recommendations for a product
    router.post('/manage/:productId', async (c) => {
      const productId = c.req.param('productId');
      const body = await c.req.json();
      const db = c.get('db');
      const logger = c.get('logger');

      // body.recommendations = [{ productId, label?, sortOrder? }]
      const { recommendations } = body;

      if (!Array.isArray(recommendations)) {
        return c.json({ error: 'recommendations must be an array' }, 400);
      }

      // Clear existing manual recs
      await db.execute('DELETE FROM plugin_product_recs_manual WHERE source_product_id = $1', [
        productId,
      ]);

      // Insert new ones
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        await db.execute(
          `INSERT INTO plugin_product_recs_manual (source_product_id, recommended_product_id, sort_order, label)
           VALUES ($1, $2, $3, $4)`,
          [productId, rec.productId, rec.sortOrder ?? i, rec.label ?? null],
        );
      }

      logger.info('Updated recommendations', { productId, count: recommendations.length });
      return c.json({ ok: true, count: recommendations.length });
    });

    // Admin: Get all products with recommendation counts
    router.get('/overview', async (c) => {
      const db = c.get('db');

      const overview = await db.execute(
        `SELECT source_product_id, COUNT(*) as rec_count
         FROM plugin_product_recs_manual
         GROUP BY source_product_id
         ORDER BY rec_count DESC`,
      );

      const copurchaseStats = await db.execute(
        `SELECT COUNT(*) as total_pairs, COALESCE(SUM(count), 0) as total_copurchases
         FROM plugin_product_recs_copurchases`,
      );

      return c.json({
        manualRecommendations: overview.rows || [],
        copurchaseStats: copurchaseStats.rows?.[0] || { total_pairs: 0, total_copurchases: 0 },
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
        <div id="fc-recs-widget" class="fc-recs-container" style="display:none;">
          <h3 class="fc-recs-title"></h3>
          <div class="fc-recs-grid"></div>
        </div>
        <style>
          .fc-recs-container {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #fafafa;
            border-radius: 12px;
          }
          .fc-recs-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #1a1a1a;
          }
          .fc-recs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
          }
          .fc-recs-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
          }
          .fc-recs-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .fc-recs-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
          }
          .fc-recs-card-body {
            padding: 0.75rem;
          }
          .fc-recs-card-name {
            font-weight: 500;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
          }
          .fc-recs-card-price {
            color: #16a34a;
            font-weight: 600;
          }
          .fc-recs-label {
            font-size: 0.75rem;
            color: #6b7280;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 0.5rem;
            display: inline-block;
          }
          @media (max-width: 640px) {
            .fc-recs-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>
        <script>
          (function() {
            const productId = window.FORKCART?.productId;
            const apiUrl = window.FORKCART?.apiUrl || '';
            if (!productId) return;

            const widget = document.getElementById('fc-recs-widget');
            const titleEl = widget.querySelector('.fc-recs-title');
            const gridEl = widget.querySelector('.fc-recs-grid');

            const settings = window.FORKCART?.pluginSettings?.['product-recs'] || {};
            const title = settings.widgetTitle || 'You might also like';
            titleEl.textContent = title;

            fetch(apiUrl + '/api/v1/public/plugins/product-recs/for/' + productId)
              .then(r => r.json())
              .then(async (data) => {
                if (!data.allIds || data.allIds.length === 0) return;

                // Fetch product details for each recommended product
                const products = await Promise.all(
                  data.allIds.map(id =>
                    fetch(apiUrl + '/api/v1/public/products/' + id)
                      .then(r => r.ok ? r.json() : null)
                      .catch(() => null)
                  )
                );

                const validProducts = products.filter(Boolean);
                if (validProducts.length === 0) return;

                // Build manual labels map
                const labelMap = {};
                (data.manual || []).forEach(m => {
                  if (m.label) labelMap[m.recommended_product_id] = m.label;
                });

                gridEl.innerHTML = validProducts.map(p => {
                  const img = p.images?.[0]?.url || p.image || '';
                  const price = p.price ? (p.price / 100).toFixed(2) : '';
                  const currency = p.currency || 'EUR';
                  const label = labelMap[p.id] || '';
                  const slug = p.slug || p.id;

                  return '<a href="/product/' + slug + '" class="fc-recs-card">'
                    + (img ? '<img src="' + img + '" alt="' + (p.name || '') + '" loading="lazy" />' : '')
                    + '<div class="fc-recs-card-body">'
                    + (label ? '<span class="fc-recs-label">' + label + '</span>' : '')
                    + '<div class="fc-recs-card-name">' + (p.name || 'Product') + '</div>'
                    + (price ? '<div class="fc-recs-card-price">' + price + ' ' + currency + '</div>' : '')
                    + '</div></a>';
                }).join('');

                widget.style.display = 'block';
              })
              .catch(err => console.error('Product recs error:', err));
          })();
        </script>
      `,
    },
  ],

  // === DATABASE MIGRATIONS ===

  migrations: [
    {
      version: '1.0.0',
      description: 'Create product recommendations tables',
      up: async (db) => {
        // Manual recommendations (admin-curated)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_product_recs_manual (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_product_id VARCHAR(255) NOT NULL,
            recommended_product_id VARCHAR(255) NOT NULL,
            sort_order INTEGER DEFAULT 0,
            label VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(source_product_id, recommended_product_id)
          );

          CREATE INDEX IF NOT EXISTS idx_recs_manual_source
          ON plugin_product_recs_manual(source_product_id);
        `);

        // Co-purchase tracking (auto-detected)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_product_recs_copurchases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_a_id VARCHAR(255) NOT NULL,
            product_b_id VARCHAR(255) NOT NULL,
            count INTEGER DEFAULT 1,
            last_purchased_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_a_id, product_b_id)
          );

          CREATE INDEX IF NOT EXISTS idx_copurchases_a
          ON plugin_product_recs_copurchases(product_a_id);

          CREATE INDEX IF NOT EXISTS idx_copurchases_b
          ON plugin_product_recs_copurchases(product_b_id);
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS plugin_product_recs_copurchases;');
        await db.execute('DROP TABLE IF EXISTS plugin_product_recs_manual;');
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
          'SELECT COUNT(DISTINCT source_product_id) as products, COUNT(*) as total FROM plugin_product_recs_manual',
        );
        const auto = await ctx.db.execute(
          'SELECT COUNT(*) as pairs, COALESCE(SUM(count), 0) as total FROM plugin_product_recs_copurchases',
        );

        ctx.logger.info('📊 Recommendation Stats:');
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
          description: 'Optional label (e.g. "Perfect match")',
          type: 'string',
          default: '',
        },
      ],
      handler: async (args, ctx) => {
        await ctx.db.execute(
          `INSERT INTO plugin_product_recs_manual (source_product_id, recommended_product_id, label)
           VALUES ($1, $2, $3)
           ON CONFLICT (source_product_id, recommended_product_id) DO UPDATE SET label = $3`,
          [args.sourceId, args.targetId, args.label || null],
        );
        ctx.logger.info(`✅ Added recommendation: ${args.sourceId} → ${args.targetId}`);
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
          ctx.logger.warn(
            'This will remove all manual recs for this product. Use --confirm to proceed.',
          );
          return;
        }
        const result = await ctx.db.execute(
          'DELETE FROM plugin_product_recs_manual WHERE source_product_id = $1',
          [args.productId],
        );
        ctx.logger.info(`🗑️ Cleared recommendations for ${args.productId}`);
      },
    },
  ],

  // === ADMIN PAGE ===

  adminPages: [
    {
      path: '/recommendations',
      label: 'Recommendations',
      icon: 'link',
      order: 45,
    },
  ],

  // === LIFECYCLE ===

  onInstall: async (ctx) => {
    ctx.logger.info(
      '🛍️ Product Recommendations plugin installed! Set up manual picks or let it learn from orders.',
    );
  },

  onActivate: async (ctx) => {
    ctx.logger.info('Product Recommendations activated — widget will appear on product pages.');
  },

  onDeactivate: async (ctx) => {
    ctx.logger.info('Product Recommendations deactivated — co-purchase data preserved.');
  },
});
