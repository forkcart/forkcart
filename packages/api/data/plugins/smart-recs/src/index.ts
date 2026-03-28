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

    // List all products (for search/picker)
    router.get('/products', async (c) => {
      const db = c.get('db');
      const search = c.req.query('q') || '';
      const limit = parseInt(c.req.query('limit') || '20');

      let result;
      if (search) {
        result = await db.execute(
          `SELECT id, name, slug, price, currency
           FROM products
           WHERE LOWER(name) LIKE $1 OR LOWER(slug) LIKE $1
           ORDER BY name ASC LIMIT $2`,
          [`%${search.toLowerCase()}%`, limit],
        );
      } else {
        result = await db.execute(
          `SELECT id, name, slug, price, currency
           FROM products ORDER BY name ASC LIMIT $1`,
          [limit],
        );
      }

      return c.json({ products: result.rows || [] });
    });

    // Get manual recommendations for a specific product
    router.get('/manual/:productId', async (c) => {
      const productId = c.req.param('productId');
      const db = c.get('db');

      const recs = await db.execute(
        `SELECT m.recommended_product_id, m.sort_order, m.label, m.created_at,
                p.name as product_name, p.slug as product_slug, p.price, p.currency
         FROM plugin_smart_recs_manual m
         LEFT JOIN products p ON p.id::text = m.recommended_product_id
         WHERE m.source_product_id = $1
         ORDER BY m.sort_order ASC`,
        [productId],
      );

      return c.json({ recommendations: recs.rows || [] });
    });

    // Get co-purchases for a specific product
    router.get('/auto/:productId', async (c) => {
      const productId = c.req.param('productId');
      const db = c.get('db');

      const pairs = await db.execute(
        `SELECT
           CASE WHEN cp.product_a_id = $1 THEN cp.product_b_id ELSE cp.product_a_id END as product_id,
           cp.count, cp.last_purchased_at,
           p.name as product_name, p.slug as product_slug
         FROM plugin_smart_recs_copurchases cp
         LEFT JOIN products p ON p.id::text = CASE WHEN cp.product_a_id = $1 THEN cp.product_b_id ELSE cp.product_a_id END
         WHERE cp.product_a_id = $1 OR cp.product_b_id = $1
         ORDER BY cp.count DESC
         LIMIT 20`,
        [productId],
      );

      return c.json({ copurchases: pairs.rows || [] });
    });

    // Dynamic admin page content — full management UI
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

      // Products that have manual recs configured
      const configured = await db.execute(
        `SELECT DISTINCT m.source_product_id, p.name as product_name, p.slug,
                COUNT(*) as rec_count
         FROM plugin_smart_recs_manual m
         LEFT JOIN products p ON p.id::text = m.source_product_id
         GROUP BY m.source_product_id, p.name, p.slug
         ORDER BY p.name ASC`,
      );

      const configuredRows = (configured.rows || [])
        .map(
          (r: any) =>
            `<tr data-product-id="${r.source_product_id}" class="sr-configured-row" style="cursor:pointer;">
          <td style="padding:10px 12px;">${r.product_name || r.source_product_id}</td>
          <td style="padding:10px 12px; text-align:center;">${r.rec_count}</td>
          <td style="padding:10px 12px; text-align:right;">
            <button class="sr-btn sr-btn-sm" onclick="srSelectProduct('${r.source_product_id}','${(r.product_name || '').replace(/'/g, "\\'")}')">Bearbeiten</button>
          </td>
        </tr>`,
        )
        .join('');

      return c.json({
        html: `
          <div id="sr-app" style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;">
            <style>
              .sr-btn { background:#3b82f6; color:#fff; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:0.875rem; font-weight:500; transition:background 0.2s; }
              .sr-btn:hover { background:#2563eb; }
              .sr-btn-sm { padding:5px 12px; font-size:0.8rem; }
              .sr-btn-danger { background:#ef4444; }
              .sr-btn-danger:hover { background:#dc2626; }
              .sr-btn-ghost { background:transparent; color:#6b7280; border:1px solid #e5e7eb; }
              .sr-btn-ghost:hover { background:#f9fafb; }
              .sr-btn-success { background:#16a34a; }
              .sr-btn-success:hover { background:#15803d; }
              .sr-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:1.5rem; margin-bottom:1rem; }
              .sr-stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem; text-align:center; }
              .sr-stat-value { font-size:2rem; font-weight:700; }
              .sr-stat-label { color:#64748b; font-size:0.875rem; margin-top:0.25rem; }
              .sr-input { width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:8px; font-size:0.9rem; box-sizing:border-box; outline:none; transition:border 0.2s; }
              .sr-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
              .sr-table { width:100%; border-collapse:collapse; }
              .sr-table th { text-align:left; padding:10px 12px; border-bottom:2px solid #e5e7eb; color:#6b7280; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; }
              .sr-table td { border-bottom:1px solid #f3f4f6; }
              .sr-table tr:hover { background:#f8fafc; }
              .sr-tabs { display:flex; gap:0; border-bottom:2px solid #e5e7eb; margin-bottom:1.5rem; }
              .sr-tab { padding:10px 20px; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; color:#6b7280; font-weight:500; transition:all 0.2s; }
              .sr-tab.active { color:#3b82f6; border-bottom-color:#3b82f6; }
              .sr-tab:hover { color:#1f2937; }
              .sr-badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:500; }
              .sr-badge-green { background:#dcfce7; color:#16a34a; }
              .sr-badge-blue { background:#dbeafe; color:#2563eb; }
              .sr-rec-item { display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#fff; }
              .sr-rec-item:hover { border-color:#93c5fd; }
              .sr-search-results { max-height:240px; overflow-y:auto; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px; }
              .sr-search-item { padding:10px 14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
              .sr-search-item:hover { background:#eff6ff; }
              .sr-empty { text-align:center; padding:2rem; color:#9ca3af; }
              .sr-section { display:none; }
              .sr-section.active { display:block; }
              .sr-back { cursor:pointer; color:#6b7280; display:inline-flex; align-items:center; gap:6px; margin-bottom:1rem; font-size:0.9rem; }
              .sr-back:hover { color:#1f2937; }
            </style>

            <!-- STATS ROW -->
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem;">
              <div class="sr-stat">
                <div class="sr-stat-value" style="color:#16a34a;">${m.total}</div>
                <div class="sr-stat-label">Manuelle Empfehlungen</div>
              </div>
              <div class="sr-stat">
                <div class="sr-stat-value" style="color:#2563eb;">${a.pairs}</div>
                <div class="sr-stat-label">Auto-Paare</div>
              </div>
              <div class="sr-stat">
                <div class="sr-stat-value" style="color:#8b5cf6;">${m.products}</div>
                <div class="sr-stat-label">Produkte konfiguriert</div>
              </div>
            </div>

            <!-- MAIN VIEW: Product List + Search -->
            <div id="sr-main" class="sr-section active">
              <div class="sr-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                  <h3 style="margin:0;">Produkt-Empfehlungen verwalten</h3>
                </div>

                <div style="margin-bottom:1rem;">
                  <input type="text" id="sr-product-search" class="sr-input" placeholder="Produkt suchen..." oninput="srSearchProducts(this.value)" />
                  <div id="sr-product-results" class="sr-search-results" style="display:none;"></div>
                </div>

                ${
                  configuredRows
                    ? `
                  <h4 style="color:#374151; margin:1.5rem 0 0.75rem;">Bereits konfiguriert</h4>
                  <table class="sr-table">
                    <thead><tr><th>Produkt</th><th style="text-align:center;">Empfehlungen</th><th style="text-align:right;">Aktion</th></tr></thead>
                    <tbody>${configuredRows}</tbody>
                  </table>
                `
                    : '<div class="sr-empty">Noch keine Empfehlungen konfiguriert. Suche oben ein Produkt!</div>'
                }
              </div>
            </div>

            <!-- DETAIL VIEW: Manage single product's recs -->
            <div id="sr-detail" class="sr-section">
              <div class="sr-back" onclick="srShowMain()">← Zurück zur Übersicht</div>
              <div class="sr-card">
                <h3 id="sr-detail-title" style="margin-top:0;"></h3>

                <div class="sr-tabs">
                  <div class="sr-tab active" onclick="srSwitchTab('manual',this)">🎯 Manuell</div>
                  <div class="sr-tab" onclick="srSwitchTab('auto',this)">🤖 Auto-Erkannt</div>
                </div>

                <!-- Manual Tab -->
                <div id="sr-tab-manual" class="sr-section active">
                  <div style="margin-bottom:1rem;">
                    <input type="text" id="sr-add-search" class="sr-input" placeholder="Produkt hinzufügen..." oninput="srSearchToAdd(this.value)" />
                    <div id="sr-add-results" class="sr-search-results" style="display:none;"></div>
                  </div>

                  <div id="sr-manual-list">
                    <div class="sr-empty">Lade...</div>
                  </div>

                  <div id="sr-manual-actions" style="margin-top:1rem; display:none;">
                    <button class="sr-btn sr-btn-success" onclick="srSaveManual()">💾 Speichern</button>
                  </div>
                </div>

                <!-- Auto Tab -->
                <div id="sr-tab-auto" class="sr-section">
                  <div id="sr-auto-list">
                    <div class="sr-empty">Lade...</div>
                  </div>
                  <p style="color:#9ca3af; font-size:0.85rem; margin-top:1rem;">
                    Auto-Paare werden aus Bestelldaten gelernt. Je öfter zwei Produkte zusammen gekauft werden, desto höher der Score.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <script>
            var SR_API = '/api/v1/public/plugins/smart-recs';
            var srCurrentProduct = null;
            var srManualRecs = [];
            var srDebounceTimer = null;

            function srSearchProducts(q) {
              clearTimeout(srDebounceTimer);
              var box = document.getElementById('sr-product-results');
              if (!q || q.length < 2) { box.style.display = 'none'; return; }
              srDebounceTimer = setTimeout(function() {
                fetch(SR_API + '/products?q=' + encodeURIComponent(q) + '&limit=10')
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (!data.products || data.products.length === 0) {
                      box.innerHTML = '<div class="sr-empty" style="padding:1rem;">Kein Produkt gefunden</div>';
                    } else {
                      box.innerHTML = data.products.map(function(p) {
                        return '<div class="sr-search-item" onclick="srSelectProduct(\\'' + p.id + '\\',\\'' + (p.name || '').replace(/'/g, "\\\\'") + '\\')">'
                          + '<span>' + (p.name || p.slug) + '</span>'
                          + '<span style="color:#9ca3af;font-size:0.8rem;">' + (p.slug || '') + '</span>'
                          + '</div>';
                      }).join('');
                    }
                    box.style.display = 'block';
                  });
              }, 300);
            }

            function srSelectProduct(id, name) {
              srCurrentProduct = { id: id, name: name };
              document.getElementById('sr-detail-title').textContent = '🛍️ ' + name;
              document.getElementById('sr-main').classList.remove('active');
              document.getElementById('sr-detail').classList.add('active');
              document.getElementById('sr-product-results').style.display = 'none';
              document.getElementById('sr-product-search').value = '';
              srLoadManual(id);
              srLoadAuto(id);
            }

            function srShowMain() {
              document.getElementById('sr-detail').classList.remove('active');
              document.getElementById('sr-main').classList.add('active');
              srCurrentProduct = null;
            }

            function srSwitchTab(tab, el) {
              document.querySelectorAll('.sr-tab').forEach(function(t) { t.classList.remove('active'); });
              el.classList.add('active');
              document.getElementById('sr-tab-manual').classList.toggle('active', tab === 'manual');
              document.getElementById('sr-tab-auto').classList.toggle('active', tab === 'auto');
            }

            function srLoadManual(productId) {
              fetch(SR_API + '/manual/' + productId)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  srManualRecs = (data.recommendations || []).map(function(r) {
                    return { productId: r.recommended_product_id, name: r.product_name || r.recommended_product_id, label: r.label || '', sortOrder: r.sort_order };
                  });
                  srRenderManual();
                });
            }

            function srRenderManual() {
              var list = document.getElementById('sr-manual-list');
              var actions = document.getElementById('sr-manual-actions');
              if (srManualRecs.length === 0) {
                list.innerHTML = '<div class="sr-empty">Noch keine manuellen Empfehlungen. Suche oben ein Produkt zum Hinzufügen!</div>';
                actions.style.display = 'none';
              } else {
                list.innerHTML = srManualRecs.map(function(r, i) {
                  return '<div class="sr-rec-item">'
                    + '<div style="flex:1;">'
                    + '<div style="font-weight:500;">' + r.name + '</div>'
                    + '<input type="text" value="' + (r.label || '') + '" placeholder="Label (optional, z.B. Passt perfekt dazu)" '
                    + 'style="margin-top:4px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:0.8rem;width:250px;" '
                    + 'onchange="srManualRecs[' + i + '].label=this.value" />'
                    + '</div>'
                    + '<div style="display:flex;align-items:center;gap:8px;">'
                    + '<span class="sr-badge sr-badge-green">#' + (i + 1) + '</span>'
                    + (i > 0 ? '<button class="sr-btn sr-btn-ghost sr-btn-sm" onclick="srMoveRec(' + i + ',-1)">↑</button>' : '')
                    + (i < srManualRecs.length - 1 ? '<button class="sr-btn sr-btn-ghost sr-btn-sm" onclick="srMoveRec(' + i + ',1)">↓</button>' : '')
                    + '<button class="sr-btn sr-btn-danger sr-btn-sm" onclick="srRemoveRec(' + i + ')">✕</button>'
                    + '</div></div>';
                }).join('');
                actions.style.display = 'block';
              }
            }

            function srMoveRec(index, dir) {
              var target = index + dir;
              if (target < 0 || target >= srManualRecs.length) return;
              var tmp = srManualRecs[index];
              srManualRecs[index] = srManualRecs[target];
              srManualRecs[target] = tmp;
              srRenderManual();
            }

            function srRemoveRec(index) {
              srManualRecs.splice(index, 1);
              srRenderManual();
            }

            function srSearchToAdd(q) {
              clearTimeout(srDebounceTimer);
              var box = document.getElementById('sr-add-results');
              if (!q || q.length < 2) { box.style.display = 'none'; return; }
              srDebounceTimer = setTimeout(function() {
                fetch(SR_API + '/products?q=' + encodeURIComponent(q) + '&limit=10')
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    var existing = srManualRecs.map(function(r) { return r.productId; });
                    var filtered = (data.products || []).filter(function(p) {
                      return p.id !== srCurrentProduct.id && existing.indexOf(p.id) === -1;
                    });
                    if (filtered.length === 0) {
                      box.innerHTML = '<div class="sr-empty" style="padding:1rem;">Keine passenden Produkte</div>';
                    } else {
                      box.innerHTML = filtered.map(function(p) {
                        return '<div class="sr-search-item" onclick="srAddRec(\\'' + p.id + '\\',\\'' + (p.name || '').replace(/'/g, "\\\\'") + '\\')">'
                          + '<span>' + (p.name || p.slug) + '</span>'
                          + '<span style="color:#16a34a;font-size:0.8rem;">+ Hinzufügen</span>'
                          + '</div>';
                      }).join('');
                    }
                    box.style.display = 'block';
                  });
              }, 300);
            }

            function srAddRec(id, name) {
              srManualRecs.push({ productId: id, name: name, label: '', sortOrder: srManualRecs.length });
              document.getElementById('sr-add-search').value = '';
              document.getElementById('sr-add-results').style.display = 'none';
              srRenderManual();
            }

            function srSaveManual() {
              if (!srCurrentProduct) return;
              var payload = srManualRecs.map(function(r, i) {
                return { productId: r.productId, sortOrder: i, label: r.label || null };
              });
              fetch(SR_API + '/manage/' + srCurrentProduct.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recommendations: payload })
              })
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (data.ok) {
                  var btn = document.querySelector('#sr-manual-actions .sr-btn-success');
                  btn.textContent = '✅ Gespeichert!';
                  setTimeout(function() { btn.textContent = '💾 Speichern'; }, 2000);
                }
              });
            }

            function srLoadAuto(productId) {
              var list = document.getElementById('sr-auto-list');
              fetch(SR_API + '/auto/' + productId)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  var pairs = data.copurchases || [];
                  if (pairs.length === 0) {
                    list.innerHTML = '<div class="sr-empty">Noch keine Co-Purchase-Daten für dieses Produkt.</div>';
                  } else {
                    list.innerHTML = pairs.map(function(p) {
                      return '<div class="sr-rec-item">'
                        + '<div><div style="font-weight:500;">' + (p.product_name || p.product_id) + '</div></div>'
                        + '<div style="display:flex;align-items:center;gap:12px;">'
                        + '<span class="sr-badge sr-badge-blue">' + p.count + 'x zusammen gekauft</span>'
                        + '<button class="sr-btn sr-btn-ghost sr-btn-sm" onclick="srPromoteToManual(\\'' + p.product_id + '\\',\\'' + (p.product_name || '').replace(/'/g, "\\\\'") + '\\')">→ Manuell übernehmen</button>'
                        + '</div></div>';
                    }).join('');
                  }
                });
            }

            function srPromoteToManual(id, name) {
              var exists = srManualRecs.some(function(r) { return r.productId === id; });
              if (exists) return;
              srManualRecs.push({ productId: id, name: name, label: 'Oft zusammen gekauft', sortOrder: srManualRecs.length });
              // Switch to manual tab
              document.querySelectorAll('.sr-tab').forEach(function(t) { t.classList.remove('active'); });
              document.querySelectorAll('.sr-tab')[0].classList.add('active');
              document.getElementById('sr-tab-auto').classList.remove('active');
              document.getElementById('sr-tab-manual').classList.add('active');
              srRenderManual();
            }
          </script>
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
