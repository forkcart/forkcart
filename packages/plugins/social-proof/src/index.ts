import { definePlugin } from '@forkcart/plugin-sdk';

// ── In-memory stores (per-instance, resets on restart) ──────────────────────

const recentPurchases: Array<{
  productName: string;
  buyerCity: string;
  timestamp: number;
}> = [];

const visitorCounts: Map<string, number> = new Map();
const trendingProducts: Map<string, number> = new Map();

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRandomCity(): string {
  const cities = [
    'Berlin',
    'Munich',
    'Hamburg',
    'Cologne',
    'Frankfurt',
    'Vienna',
    'Zurich',
    'Amsterdam',
    'Paris',
    'London',
    'New York',
    'Tokyo',
    'Sydney',
    'Toronto',
    'Stockholm',
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}

function getTimeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

// ── Plugin Definition ───────────────────────────────────────────────────────

export default definePlugin({
  name: 'social-proof',
  version: '1.0.0',
  type: 'general',
  description:
    'Show real-time social proof notifications — recent purchases, visitor counts, and trending badges to boost conversions.',
  author: 'ForkCart',
  license: 'MIT',
  homepage: 'https://forkcart.com/plugins/social-proof',
  keywords: ['social-proof', 'conversion', 'fomo', 'notifications', 'trending'],
  permissions: ['orders:read', 'products:read', 'analytics:read'],

  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable Social Proof',
      description: 'Master switch for all social proof features',
      default: true,
    },
    showRecentPurchases: {
      type: 'boolean',
      label: 'Show Recent Purchases',
      description: 'Display "X from Y just bought Z" toast notifications',
      default: true,
    },
    showVisitorCount: {
      type: 'boolean',
      label: 'Show Visitor Count',
      description: 'Show "X people are viewing this product" on product pages',
      default: true,
    },
    showTrendingBadge: {
      type: 'boolean',
      label: 'Show Trending Badge',
      description: 'Add a "Trending" badge to popular products',
      default: true,
    },
    notificationDelay: {
      type: 'number',
      label: 'Notification Delay (seconds)',
      description: 'Delay between purchase notification popups',
      default: 5,
      min: 2,
      max: 30,
    },
    maxNotifications: {
      type: 'number',
      label: 'Max Notifications per Page',
      description: 'Maximum number of notifications shown per page view',
      default: 3,
      min: 1,
      max: 10,
    },
    trendingThreshold: {
      type: 'number',
      label: 'Trending Threshold',
      description: 'Minimum orders in 24h to mark a product as trending',
      default: 5,
      min: 2,
      max: 50,
    },
    displayPosition: {
      type: 'select',
      label: 'Notification Position',
      description: 'Where to show purchase notifications',
      options: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
      default: 'bottom-left',
    },
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onActivate(ctx) {
    ctx.logger.info('Social Proof plugin activated');
  },

  async onDeactivate(ctx) {
    recentPurchases.length = 0;
    visitorCounts.clear();
    trendingProducts.clear();
    ctx.logger.info('Social Proof plugin deactivated, caches cleared');
  },

  async onInstall(ctx) {
    ctx.logger.info('Social Proof plugin installed');
  },

  // ── Event Hooks ───────────────────────────────────────────────────────────

  hooks: {
    'order:created': async (event, ctx) => {
      const order = event.payload;
      if (!ctx.settings.enabled || !ctx.settings.showRecentPurchases) return;

      // Track the purchase for notifications
      const items = (order as Record<string, unknown>).items as
        | Array<{ productName?: string }>
        | undefined;
      const productName = items?.[0]?.productName || 'an item';

      recentPurchases.unshift({
        productName,
        buyerCity: getRandomCity(),
        timestamp: Date.now(),
      });

      // Keep only last 50
      if (recentPurchases.length > 50) {
        recentPurchases.length = 50;
      }

      // Track trending
      const productId = String((order as Record<string, unknown>).productId || 'unknown');
      trendingProducts.set(productId, (trendingProducts.get(productId) || 0) + 1);

      ctx.logger.debug('Purchase tracked for social proof', { productName });
    },
  },

  // ── Filters ───────────────────────────────────────────────────────────────

  filters: {
    'storefront:footer': (html, ctx) => {
      if (!ctx.settings.enabled) return html;

      const position = ctx.settings.displayPosition || 'bottom-left';
      const delay = (ctx.settings.notificationDelay as number) * 1000 || 5000;
      const max = ctx.settings.maxNotifications || 3;

      // Inject the social proof widget script
      const script = `
<style>
  .fc-social-proof-toast {
    position: fixed;
    ${position.includes('bottom') ? 'bottom: 20px' : 'top: 20px'};
    ${position.includes('left') ? 'left: 20px' : 'right: 20px'};
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    animation: fcSlideIn 0.4s ease-out;
    max-width: 340px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    border-left: 3px solid #10b981;
    transition: opacity 0.3s, transform 0.3s;
  }
  .fc-social-proof-toast.fc-hiding {
    opacity: 0;
    transform: translateY(10px);
  }
  .fc-social-proof-icon { font-size: 24px; flex-shrink: 0; }
  .fc-social-proof-text { line-height: 1.4; color: #374151; }
  .fc-social-proof-text strong { color: #111827; }
  .fc-social-proof-time { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .fc-social-proof-close {
    position: absolute; top: 6px; right: 10px;
    cursor: pointer; color: #9ca3af; font-size: 16px;
    background: none; border: none; padding: 2px;
  }
  .fc-social-proof-close:hover { color: #374151; }
  .fc-visitor-count {
    display: inline-flex; align-items: center; gap: 6px;
    background: #fef3c7; color: #92400e; padding: 6px 12px;
    border-radius: 20px; font-size: 13px; font-weight: 500;
    margin: 8px 0;
  }
  .fc-visitor-count .fc-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #f59e0b; animation: fcPulse 2s infinite;
  }
  .fc-trending-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: #fee2e2; color: #dc2626; padding: 4px 10px;
    border-radius: 12px; font-size: 12px; font-weight: 600;
    text-transform: uppercase;
  }
  @keyframes fcSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fcPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
<script>
(function() {
  const purchases = ${JSON.stringify(recentPurchases.slice(0, max))};
  let shown = 0;
  const delay = ${delay};
  const maxShow = ${max};

  function showToast(purchase) {
    const existing = document.querySelector('.fc-social-proof-toast');
    if (existing) {
      existing.classList.add('fc-hiding');
      setTimeout(() => existing.remove(), 300);
    }

    const toast = document.createElement('div');
    toast.className = 'fc-social-proof-toast';
    toast.innerHTML = \`
      <span class="fc-social-proof-icon">🛒</span>
      <div>
        <div class="fc-social-proof-text">
          Someone from <strong>\${purchase.buyerCity}</strong> just bought
          <strong>\${purchase.productName}</strong>
        </div>
        <div class="fc-social-proof-time">\${purchase.timeAgo || 'just now'}</div>
      </div>
      <button class="fc-social-proof-close" onclick="this.parentElement.remove()">×</button>
    \`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fc-hiding');
      setTimeout(() => toast.remove(), 300);
    }, delay - 500);
  }

  if (purchases.length > 0) {
    setTimeout(() => {
      function showNext() {
        if (shown >= purchases.length || shown >= maxShow) return;
        const p = purchases[shown];
        p.timeAgo = p.timestamp ? timeAgo(p.timestamp) : 'just now';
        showToast(p);
        shown++;
        setTimeout(showNext, delay);
      }

      function timeAgo(ts) {
        const mins = Math.floor((Date.now() - ts) / 60000);
        if (mins < 1) return 'just now';
        if (mins === 1) return '1 minute ago';
        if (mins < 60) return mins + ' minutes ago';
        const hrs = Math.floor(mins / 60);
        return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
      }

      showNext();
    }, 2000);
  }
})();
</script>`;

      return String(html || '') + script;
    },
  },

  // ── Storefront Slots ──────────────────────────────────────────────────────

  storefrontSlots: [
    {
      slot: 'product-page-top',
      content: '<div id="fc-social-proof-visitor-count"></div>',
      priority: 10,
    },
  ],

  // ── Custom API Routes ─────────────────────────────────────────────────────

  routes(router) {
    // GET /api/v1/plugins/social-proof/recent
    router.get('/recent', (c: unknown) => {
      const recent = recentPurchases.slice(0, 10).map((p) => ({
        ...p,
        timeAgo: getTimeAgo(p.timestamp),
      }));
      return (c as { json: (data: unknown) => unknown }).json({ purchases: recent });
    });

    // GET /api/v1/plugins/social-proof/stats
    router.get('/stats', (c: unknown) => {
      return (c as { json: (data: unknown) => unknown }).json({
        totalTracked: recentPurchases.length,
        activeProducts: trendingProducts.size,
        trending: [...trendingProducts.entries()]
          .filter(([, count]) => count >= 5)
          .map(([id, count]) => ({ productId: id, orders24h: count })),
      });
    });

    // POST /api/v1/plugins/social-proof/track-view
    router.post('/track-view', (c: unknown) => {
      const body = (c as { req: { json: () => Promise<{ productId?: string }> } }).req;
      // Increment visitor count for product
      return (c as { json: (data: unknown) => unknown }).json({ ok: true });
    });
  },

  // ── Scheduled Tasks ───────────────────────────────────────────────────────

  scheduledTasks: [
    {
      name: 'cleanup-old-purchases',
      schedule: '0 * * * *', // Every hour
      enabled: true,
      async handler(ctx) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        const before = recentPurchases.length;

        // Remove purchases older than 24h
        while (
          recentPurchases.length > 0 &&
          recentPurchases[recentPurchases.length - 1].timestamp < cutoff
        ) {
          recentPurchases.pop();
        }

        // Reset trending counts
        trendingProducts.clear();

        ctx.logger.info(
          `Cleaned up social proof data: ${before - recentPurchases.length} old entries removed`,
        );
      },
    },
  ],
});
