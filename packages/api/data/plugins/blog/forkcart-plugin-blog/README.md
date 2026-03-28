# ForkCart Blog Plugin 📝

Add a full blog to your ForkCart store. Create posts, link products, boost SEO.

## Features

- **📝 Blog Posts** — Create, edit, publish with categories & tags
- **🖼️ Cover Images** — Visual cards on the blog listing
- **🔗 Product Linking** — Mention products in posts (shown as cards)
- **📊 View Tracking** — See which posts are popular
- **🕐 Scheduled Publishing** — Set a future date, posts publish automatically
- **📖 Storefront Pages** — `/ext/blog` (listing) + `/ext/blog/:slug` (detail)
- **🧩 PageBuilder Block** — "Latest Posts" widget for any page
- **🔍 SEO** — Meta title, description, RSS feed
- **📂 Categories & Tags** — Filterable on the storefront
- **⏱️ Reading Time** — Auto-calculated
- **🔧 Admin Dashboard** — Full CRUD with post editor
- **💻 CLI Commands** — stats, list, publish

## Storefront

| Page | URL | Description |
|------|-----|-------------|
| Blog Listing | `/ext/blog` | All published posts, filterable by category |
| Blog Post | `/ext/blog/:slug` | Single post with linked products |

Shows automatically in storefront navigation (configurable).

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Show blog |
| `postsPerPage` | `10` | Posts per page |
| `enableComments` | `false` | Comments (coming soon) |
| `defaultAuthor` | `""` | Fallback author |
| `excerptLength` | `200` | Auto-excerpt chars |
| `showInNav` | `true` | Nav link |
| `rssEnabled` | `true` | RSS feed |
| `dateFormat` | `DD.MM.YYYY` | Date format |

## API Endpoints

### Public
```
GET  /api/v1/public/plugins/blog/posts              — List published posts
GET  /api/v1/public/plugins/blog/posts/:slug         — Single post
GET  /api/v1/public/plugins/blog/categories          — Categories with counts
GET  /api/v1/public/plugins/blog/tags                — All tags
GET  /api/v1/public/plugins/blog/rss                 — RSS feed
```

### Admin
```
GET    /api/v1/public/plugins/blog/admin/posts       — All posts (incl. drafts)
GET    /api/v1/public/plugins/blog/admin/posts/:id   — Single post for editing
POST   /api/v1/public/plugins/blog/admin/posts       — Create post
PUT    /api/v1/public/plugins/blog/admin/posts/:id   — Update post
DELETE /api/v1/public/plugins/blog/admin/posts/:id   — Delete post
POST   /api/v1/public/plugins/blog/admin/posts/:id/products — Link products
```

## CLI

```bash
forkcart plugin run blog:stats
forkcart plugin run blog:list --status published
forkcart plugin run blog:publish mein-erster-post
```

## Database

- `plugin_blog_posts` — Posts with content, SEO, status
- `plugin_blog_product_links` — Post ↔ Product links (uses `ref('products.id')`)

## New Docs Features Used

- ✅ `storefrontPages` with `contentRoute` + `scripts` + `styles`
- ✅ `ref()` in migrations
- ✅ `onReady` (checks scheduled posts on startup)
- ✅ `onError` (error tracking)
- ✅ `scheduledTasks` (auto-publish every 5 min)
- ✅ `filters` (RSS link in `<head>`)
- ✅ Admin page with `apiRoute`
- ✅ PageBuilder block with fallback
- ✅ CLI commands

## License

MIT — Built with 🦉 by Tyto
