# Social Proof Plugin for ForkCart

Boost your store's conversions with real-time social proof notifications.

## Features

- 🛒 **Recent Purchase Notifications** — "Someone from Berlin just bought Product X"
- 👀 **Visitor Count** — "12 people are viewing this product right now"
- 🔥 **Trending Badge** — Automatically added to popular products
- ⚡ **Zero Config** — Works out of the box, customize via settings

## Settings

| Setting               | Default     | Description                             |
| --------------------- | ----------- | --------------------------------------- |
| Enable Social Proof   | true        | Master switch                           |
| Show Recent Purchases | true        | Purchase toast notifications            |
| Show Visitor Count    | true        | Real-time viewer count on product pages |
| Show Trending Badge   | true        | Badge on popular products               |
| Notification Delay    | 5s          | Time between notifications              |
| Max Notifications     | 3           | Notifications per page view             |
| Trending Threshold    | 5           | Orders in 24h to mark as trending       |
| Display Position      | bottom-left | Toast notification position             |

## API Endpoints

- `GET /api/v1/plugins/social-proof/recent` — Recent purchase notifications
- `GET /api/v1/plugins/social-proof/stats` — Trending stats and tracked data
- `POST /api/v1/plugins/social-proof/track-view` — Track product page view

## How It Works

The plugin listens for `order:created` events and tracks purchases in memory. It injects a lightweight script into the storefront footer that displays toast notifications with purchase data. No external dependencies, no tracking pixels, fully GDPR-friendly (no personal data stored).

## Requirements

- ForkCart >= 0.1.0

## License

MIT
