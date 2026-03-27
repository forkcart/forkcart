# ForkCart Social Proof Plugin 🔥

Display real-time social proof indicators on product pages to boost conversions.

## Features

- **👀 "X people viewing now"** — Real-time viewer count with heartbeat tracking
- **🔥 "Y sold in last 24 hours"** — Daily sales counter (auto-resets at midnight)
- **🛒 "Z people have this in cart"** — Live cart tracking

## Why Social Proof?

Social proof triggers **FOMO** (Fear Of Missing Out) and builds trust:

- "If others are buying, it must be good"
- "Better buy now before it's gone"
- Studies show **15-30% conversion lift** with social proof elements

## Installation

```bash
forkcart plugin install forkcart-plugin-social-proof
forkcart plugin activate social-proof
```

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable/disable the widget | `true` |
| `showViewers` | Show viewer count | `true` |
| `showSoldToday` | Show sold today count | `true` |
| `showInCarts` | Show "in cart" count | `true` |
| `minViewers` | Minimum viewers to display | `2` |
| `viewerTimeout` | Seconds until viewer is "gone" | `120` |
| `style` | Display style (badge/text/toast) | `badge` |
| `position` | Widget position | `below-price` |

## CLI Commands

```bash
# View stats for a product
forkcart plugin run social-proof:stats <productId>

# View total stats
forkcart plugin run social-proof:stats

# Reset all stats
forkcart plugin run social-proof:reset --confirm
```

## How It Works

1. **Viewer Tracking**: JavaScript heartbeat pings `/api/v1/plugins/social-proof/heartbeat` every 30s
2. **Cart Tracking**: Hooks into `cart:item-added` and `cart:item-removed` events
3. **Sales Tracking**: Hooks into `order:paid` event to count sales
4. **Daily Reset**: Scheduled task resets `sold_today` at midnight

## API Endpoints

```
POST /api/v1/plugins/social-proof/heartbeat
  Body: { productId, sessionId }

GET /api/v1/plugins/social-proof/stats/:productId
  Returns: { viewing, soldToday, inCarts }
```

## Customization

Override styles in your storefront:

```css
.social-proof-container {
  background: your-color;
  border-radius: 12px;
}

.social-proof-item.viewing { color: blue; }
.social-proof-item.sold { color: red; }
.social-proof-item.carts { color: green; }
```

## License

MIT — Built with 🦉 by Tyto

---

*"FOMO is a feature, not a bug."*
