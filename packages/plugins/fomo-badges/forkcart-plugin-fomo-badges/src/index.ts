// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { definePlugin } from '@forkcart/plugin-sdk';

/**
 * ForkCart Social Proof Plugin
 *
 * Shows real-time social proof indicators on product pages:
 * - "X people are viewing this right now"
 * - "Y sold in the last 24 hours"
 * - "Z people have this in their cart"
 *
 * Increases urgency and trust → higher conversion rates.
 *
 * @author Tyto 🦉
 * @version 1.0.0
 */

interface ViewerSession {
  productId: string;
  sessionId: string;
  lastSeen: number;
}

// In-memory store for active viewers (would use Redis in production)
const activeViewers = new Map<string, ViewerSession[]>();

export default definePlugin({
  name: 'fomo-badges',
  version: '1.0.0',
  type: 'general',
  description: 'Display real-time FOMO badges on product pages to boost conversions',
  author: 'Tyto 🦉',
  keywords: ['fomo', 'badges', 'conversion', 'urgency', 'social-proof', 'analytics'],

  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable Social Proof',
      default: true,
      description: 'Show social proof indicators on product pages',
    },
    showViewers: {
      type: 'boolean',
      label: 'Show "X viewing now"',
      default: true,
    },
    showSoldToday: {
      type: 'boolean',
      label: 'Show "Y sold today"',
      default: true,
    },
    showInCarts: {
      type: 'boolean',
      label: 'Show "Z in carts"',
      default: true,
    },
    minViewers: {
      type: 'number',
      label: 'Minimum viewers to display',
      default: 2,
      min: 1,
      max: 10,
      description: 'Only show viewer count when above this threshold',
    },
    viewerTimeout: {
      type: 'number',
      label: 'Viewer timeout (seconds)',
      default: 120,
      min: 30,
      max: 600,
      description: 'How long until a viewer is considered "gone"',
    },
    style: {
      type: 'select',
      label: 'Display Style',
      options: ['badge', 'text', 'toast'],
      default: 'badge',
    },
    position: {
      type: 'select',
      label: 'Position on Product Page',
      options: ['below-title', 'below-price', 'sidebar'],
      default: 'below-price',
    },
  },

  permissions: ['orders:read', 'products:read', 'analytics:read'],

  hooks: {
    // Track when items are added to cart
    'cart:item-added': async (event, ctx) => {
      const { productId } = event.payload;
      ctx.logger.debug('Cart item added', { productId });

      // Increment cart count in DB
      await ctx.db.execute(
        `
        INSERT INTO plugin_fomo_badges_stats (product_id, stat_type, count, updated_at)
        VALUES ($1, 'in_carts', 1, NOW())
        ON CONFLICT (product_id, stat_type) 
        DO UPDATE SET count = plugin_fomo_badges_stats.count + 1, updated_at = NOW()
      `,
        [productId],
      );
    },

    // Track when items are removed from cart
    'cart:item-removed': async (event, ctx) => {
      const { productId } = event.payload;
      ctx.logger.debug('Cart item removed', { productId });

      await ctx.db.execute(
        `
        UPDATE plugin_fomo_badges_stats 
        SET count = GREATEST(0, count - 1), updated_at = NOW()
        WHERE product_id = $1 AND stat_type = 'in_carts'
      `,
        [productId],
      );
    },

    // Track sales
    'order:paid': async (event, ctx) => {
      const { items } = event.payload;
      ctx.logger.info('Order paid, updating sold counts', { itemCount: items.length });

      for (const item of items) {
        // Increment sold_today count
        await ctx.db.execute(
          `
          INSERT INTO plugin_fomo_badges_stats (product_id, stat_type, count, updated_at)
          VALUES ($1, 'sold_today', $2, NOW())
          ON CONFLICT (product_id, stat_type) 
          DO UPDATE SET count = plugin_fomo_badges_stats.count + $2, updated_at = NOW()
        `,
          [item.productId, item.quantity],
        );

        // Decrement cart count (they bought it)
        await ctx.db.execute(
          `
          UPDATE plugin_fomo_badges_stats 
          SET count = GREATEST(0, count - $2), updated_at = NOW()
          WHERE product_id = $1 AND stat_type = 'in_carts'
        `,
          [item.productId, item.quantity],
        );
      }
    },
  },

  // Custom API routes
  routes: (router) => {
    // Heartbeat endpoint - called by storefront JS to track viewers
    router.post('/heartbeat', async (c) => {
      const { productId, sessionId } = await c.req.json();

      if (!productId || !sessionId) {
        return c.json({ error: 'Missing productId or sessionId' }, 400);
      }

      const now = Date.now();
      const viewers = activeViewers.get(productId) || [];

      // Update or add this viewer
      const existingIdx = viewers.findIndex((v) => v.sessionId === sessionId);
      if (existingIdx >= 0) {
        viewers[existingIdx].lastSeen = now;
      } else {
        viewers.push({ productId, sessionId, lastSeen: now });
      }

      activeViewers.set(productId, viewers);

      return c.json({ ok: true });
    });

    // Get social proof stats for a product
    router.get('/stats/:productId', async (c) => {
      const productId = c.req.param('productId');
      const settings = c.get('pluginSettings');
      const now = Date.now();
      const timeout = (settings.viewerTimeout as number) * 1000;

      // Count active viewers (within timeout)
      const viewers = activeViewers.get(productId) || [];
      const activeCount = viewers.filter((v) => now - v.lastSeen < timeout).length;

      // Clean up stale viewers
      activeViewers.set(
        productId,
        viewers.filter((v) => now - v.lastSeen < timeout),
      );

      // Get DB stats
      const db = c.get('db');
      const stats = await db.execute(
        `
        SELECT stat_type, count FROM plugin_fomo_badges_stats
        WHERE product_id = $1
      `,
        [productId],
      );

      const result: Record<string, number> = {
        viewing: activeCount,
        soldToday: 0,
        inCarts: 0,
      };

      for (const row of stats.rows || []) {
        if (row.stat_type === 'sold_today') result.soldToday = row.count;
        if (row.stat_type === 'in_carts') result.inCarts = row.count;
      }

      return c.json(result);
    });
  },

  // Inject social proof widget into storefront
  storefrontSlots: [
    {
      slot: 'product-page-bottom',
      content: `
        <div id="social-proof-widget" class="social-proof-container" style="display:none;">
          <div class="social-proof-item viewing" style="display:none;">
            👀 <span class="count"></span> people are viewing this right now
          </div>
          <div class="social-proof-item sold" style="display:none;">
            🔥 <span class="count"></span> sold in the last 24 hours
          </div>
          <div class="social-proof-item carts" style="display:none;">
            🛒 <span class="count"></span> people have this in their cart
          </div>
        </div>
        <style>
          .social-proof-container {
            margin: 1rem 0;
            padding: 0.75rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            font-size: 0.9rem;
          }
          .social-proof-item {
            padding: 0.25rem 0;
            color: #495057;
          }
          .social-proof-item .count {
            font-weight: 600;
            color: #212529;
          }
          .social-proof-item.viewing { color: #0d6efd; }
          .social-proof-item.sold { color: #dc3545; }
          .social-proof-item.carts { color: #198754; }
        </style>
        <script>
          (function() {
            const productId = window.FORKCART?.productId;
            if (!productId) return;
            
            const sessionId = localStorage.getItem('fc_session') || 
              (localStorage.setItem('fc_session', crypto.randomUUID()), localStorage.getItem('fc_session'));
            
            const widget = document.getElementById('social-proof-widget');
            const minViewers = 2; // From settings
            
            async function updateStats() {
              try {
                const res = await fetch('/api/v1/plugins/fomo-badges/stats/' + productId);
                const stats = await res.json();
                
                let hasContent = false;
                
                if (stats.viewing >= minViewers) {
                  widget.querySelector('.viewing').style.display = 'block';
                  widget.querySelector('.viewing .count').textContent = stats.viewing;
                  hasContent = true;
                }
                
                if (stats.soldToday > 0) {
                  widget.querySelector('.sold').style.display = 'block';
                  widget.querySelector('.sold .count').textContent = stats.soldToday;
                  hasContent = true;
                }
                
                if (stats.inCarts > 0) {
                  widget.querySelector('.carts').style.display = 'block';
                  widget.querySelector('.carts .count').textContent = stats.inCarts;
                  hasContent = true;
                }
                
                widget.style.display = hasContent ? 'block' : 'none';
              } catch (e) {
                console.error('Social proof error:', e);
              }
            }
            
            async function heartbeat() {
              try {
                await fetch('/api/v1/plugins/fomo-badges/heartbeat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productId, sessionId })
                });
              } catch (e) {}
            }
            
            // Initial load
            updateStats();
            heartbeat();
            
            // Refresh every 30 seconds
            setInterval(updateStats, 30000);
            setInterval(heartbeat, 30000);
          })();
        </script>
      `,
      order: 10,
    },
  ],

  // Reset sold_today counts at midnight
  scheduledTasks: [
    {
      name: 'reset-daily-stats',
      schedule: '0 0 * * *', // Midnight daily
      enabled: true,
      handler: async (ctx) => {
        ctx.logger.info('Resetting daily sold counts');
        await ctx.db.execute(`
          UPDATE plugin_fomo_badges_stats 
          SET count = 0, updated_at = NOW()
          WHERE stat_type = 'sold_today'
        `);
      },
    },
  ],

  // Database migrations
  migrations: [
    {
      version: '1.0.0',
      description: 'Create social proof stats table',
      up: async (db) => {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_fomo_badges_stats (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(255) NOT NULL,
            stat_type VARCHAR(50) NOT NULL,
            count INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(product_id, stat_type)
          );
          
          CREATE INDEX IF NOT EXISTS idx_fomo_badges_product 
          ON plugin_fomo_badges_stats(product_id);
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS plugin_fomo_badges_stats;');
      },
    },
  ],

  // CLI commands
  cli: [
    {
      name: 'stats',
      description: 'Show social proof statistics',
      args: [{ name: 'productId', description: 'Product ID (optional)', required: false }],
      handler: async (args, ctx) => {
        if (args.productId) {
          const stats = await ctx.db.execute(
            `
            SELECT stat_type, count FROM plugin_fomo_badges_stats
            WHERE product_id = $1
          `,
            [args.productId],
          );
          ctx.logger.info('Stats for product', { productId: args.productId, stats: stats.rows });
        } else {
          const totals = await ctx.db.execute(`
            SELECT stat_type, SUM(count) as total 
            FROM plugin_fomo_badges_stats 
            GROUP BY stat_type
          `);
          ctx.logger.info('Total stats across all products', { totals: totals.rows });
        }
      },
    },
    {
      name: 'reset',
      description: 'Reset all social proof statistics',
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
          ctx.logger.warn('This will reset ALL social proof stats. Use --confirm to proceed.');
          return;
        }
        await ctx.db.execute('TRUNCATE TABLE plugin_fomo_badges_stats;');
        ctx.logger.info('All social proof stats have been reset.');
      },
    },
  ],

  // Admin page
  adminPages: [
    {
      path: '/social-proof',
      label: 'Social Proof',
      icon: 'fire',
      order: 50,
    },
  ],

  // Lifecycle hooks
  onInstall: async (ctx) => {
    ctx.logger.info('🦉 Social Proof plugin installed! Your conversions are about to go up.');
  },

  onActivate: async (ctx) => {
    ctx.logger.info('Social Proof activated - FOMO mode engaged! 🔥');
  },

  onDeactivate: async (ctx) => {
    ctx.logger.info('Social Proof deactivated - customers can relax now 😌');
  },
});
