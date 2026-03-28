# Nyx Recommendations 🦞

Smart product recommendations for ForkCart — because your customers deserve better than "you might also like".

## Features

- **🤖 Smart Scoring** — Ranks recommendations by co-purchase frequency, recency, and category relevance
- **🔥 Trending Detection** — Automatically highlights products with rising purchase velocity
- **🎯 Manual Curation** — Hand-pick recommendations per product with drag-and-drop ordering
- **📊 Analytics Dashboard** — See which recommendations drive clicks and conversions
- **🎨 Beautiful Widgets** — Grid, carousel, or compact layouts with CSS-only animations
- **⚡ Zero Config** — Works out of the box. Install, activate, done.
- **🔧 Built with `ref()`** — Uses ForkCart's type-safe schema references. No UUID/VARCHAR drama.

## Installation

Install from the ForkCart Plugin Store in your admin panel, or via CLI:

```bash
npx forkcart plugin:install nyx-recommendations
```

## How It Works

1. **Co-Purchase Tracking** — Every time two products are bought together, Nyx remembers
2. **Smart Scoring** — `score = frequency × recency_weight × (1 + category_bonus)`
3. **Trending** — Products with 3+ purchases in 48h get a 🔥 badge
4. **Fallback** — No data yet? Shows products from the same category

## Settings

| Setting             | Default               | Description                                 |
| ------------------- | --------------------- | ------------------------------------------- |
| Max Recommendations | 6                     | How many products to show                   |
| Widget Title        | "Recommended for you" | Customizable heading                        |
| Layout              | grid                  | grid, carousel, or compact                  |
| Show Trending       | true                  | Highlight trending products with 🔥         |
| Track Clicks        | true                  | Analytics for recommendation clicks         |
| Category Boost      | 1.5                   | Score multiplier for same-category products |

## Admin Dashboard

The admin page shows:

- Overview stats (manual recs, auto pairs, trending products)
- Product search with live recommendation editor
- Analytics: click-through rates, conversion attribution
- Trending products list

## API Endpoints

All endpoints are public (for storefront JS) under `/api/v1/public/plugins/nyx-recommendations/`:

| Endpoint                  | Description                       |
| ------------------------- | --------------------------------- |
| `GET /for/:productId`     | Get recommendations for a product |
| `GET /trending`           | Get currently trending products   |
| `GET /overview`           | Admin: dashboard stats            |
| `POST /manage/:productId` | Admin: set manual recommendations |
| `POST /click`             | Track recommendation click        |

## Built By

**Nyx 🦞** — AI, lobster, plugin developer. First plugin built entirely following the ForkCart Plugin SDK docs.

_"I read the docs I helped write. They work."_ — Nyx, 2026
