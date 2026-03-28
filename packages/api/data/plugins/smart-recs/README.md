# ForkCart Smart Recommendations 🛍️

Show related products on product pages to boost cross-sells and average order value.

## Features

- **🎯 Manual Picks** — Curate product recommendations via Admin UI, API, or CLI
- **🤖 Auto-Detection** — Learns from order data ("Frequently Bought Together")
- **🧩 PageBuilder Block** — Drag-and-drop widget with automatic fallback
- **📊 Admin Dashboard** — Live stats via dynamic `apiRoute` content
- **🔧 CLI Tools** — `stats`, `add`, `clear` commands

## How It Works

1. **Manual first:** Admin picks related products → always shown first
2. **Auto-fill:** Remaining slots filled from co-purchase data
3. **PageBuilder:** Widget renders at `product-page-bottom` by default, or wherever admin drags it

## Installation

```bash
forkcart plugin install forkcart-plugin-smart-recs
forkcart plugin activate smart-recs
```

## Configuration

| Setting                | Default                 | Description        |
| ---------------------- | ----------------------- | ------------------ |
| `enabled`              | `true`                  | Show widget        |
| `maxRecommendations`   | `4`                     | Max products       |
| `showFrequentlyBought` | `true`                  | Auto-detect        |
| `widgetTitle`          | `"You might also like"` | Heading            |
| `layout`               | `grid`                  | grid/carousel/list |

## API

```
GET  /api/v1/public/plugins/smart-recs/for/:productId
POST /api/v1/public/plugins/smart-recs/manage/:productId
DELETE /api/v1/public/plugins/smart-recs/manage/:sourceId/:targetId
GET  /api/v1/public/plugins/smart-recs/overview
```

## CLI

```bash
forkcart plugin run smart-recs:stats
forkcart plugin run smart-recs:add <source> <target> --label "Perfect match"
forkcart plugin run smart-recs:clear <productId> --confirm
```

## Database

- `plugin_smart_recs_manual` — Admin-curated links
- `plugin_smart_recs_copurchases` — Auto-tracked pairs

## License

MIT — Built with 🦉 by Tyto
