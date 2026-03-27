# ForkCart Product Recommendations 🛍️

Show related products on product pages to boost cross-sells and average order value.

## Features

- **🎯 Manual Picks** — Curate specific product recommendations per product
- **🤖 Auto-Detection** — Learns from order data ("Frequently Bought Together")
- **🧩 PageBuilder Block** — Drag-and-drop widget with fallback rendering
- **📊 Admin Dashboard** — Overview of all recommendations
- **🔧 CLI Tools** — Bulk manage recommendations from terminal

## How It Works

### Manual Recommendations

Admin picks related products for each product page. These always show first.

### Frequently Bought Together

When customers buy multiple products in one order, the plugin tracks these co-purchases. Over time, it builds a "frequently bought together" graph that fills remaining recommendation slots.

### Priority: Manual → Auto

Manual picks show first. Remaining slots are filled with auto-detected recommendations.

## Installation

```bash
forkcart plugin install forkcart-plugin-product-recs
forkcart plugin activate product-recs
```

## Configuration

| Setting                | Description                  | Default                 |
| ---------------------- | ---------------------------- | ----------------------- |
| `enabled`              | Enable recommendation widget | `true`                  |
| `maxRecommendations`   | Max products to show         | `4`                     |
| `showFrequentlyBought` | Auto-detect from orders      | `true`                  |
| `widgetTitle`          | Widget heading               | `"You might also like"` |
| `layout`               | Grid, carousel, or list      | `grid`                  |

## API Endpoints

```
GET  /api/v1/public/plugins/product-recs/for/:productId
  → { manual: [...], auto: [...], allIds: [...] }

POST /api/v1/public/plugins/product-recs/manage/:productId
  Body: { recommendations: [{ productId, label?, sortOrder? }] }

GET  /api/v1/public/plugins/product-recs/overview
  → { manualRecommendations: [...], copurchaseStats: {...} }
```

## CLI Commands

```bash
# View stats
forkcart plugin run product-recs:stats

# Add a recommendation
forkcart plugin run product-recs:add <sourceId> <targetId> --label "Perfect match"

# Clear recommendations for a product
forkcart plugin run product-recs:clear <productId> --confirm
```

## Database Tables

- `plugin_product_recs_manual` — Admin-curated recommendations
- `plugin_product_recs_copurchases` — Auto-tracked purchase pairs

## License

MIT — Built with 🦉 by Tyto

---

_"Kunden die X kauften, kauften auch Y" — since 1998, still works._
