# ForkCart Page Builder — Architecture Spec

## Overview

Visual drag-and-drop page builder for creating storefronts, landing pages, and content pages.
Built on Craft.js (React-native, JSON-serialized, server-renderable).

## Architecture

### Layer 1: Database (`packages/database`)

**New schema: `pages.ts`**

```
pages:
  id: uuid PK
  title: varchar(255)
  slug: varchar(255) UNIQUE
  status: 'draft' | 'published' | 'archived'
  content: jsonb (Craft.js serialized tree)
  seoTitle: varchar(255)
  seoDescription: text
  isHomepage: boolean default false
  sortOrder: int default 0
  createdAt: timestamp
  updatedAt: timestamp
  publishedAt: timestamp nullable
```

**New schema: `page_translations.ts`** (i18n support)

```
page_translations:
  id: uuid PK
  pageId: uuid FK -> pages.id
  locale: varchar(10)
  title: varchar(255)
  content: jsonb (translated Craft.js tree — only text nodes differ)
  seoTitle: varchar(255)
  seoDescription: text
  UNIQUE(pageId, locale)
```

Migration: `0016_pages.sql`

### Layer 2: Core (`packages/core`)

**New module: `pages/`**

- `repository.ts` — CRUD, findBySlug, findHomepage, list with pagination
- `service.ts` — Business logic, publish/unpublish, duplicate, version history
- `index.ts` — Exports

### Layer 3: API (`packages/api`)

**New routes: `routes/v1/pages.ts`**

- `GET /api/v1/pages` — List pages (admin: all, storefront: published only)
- `GET /api/v1/pages/:idOrSlug` — Get page by ID or slug
- `POST /api/v1/pages` — Create page (admin only)
- `PUT /api/v1/pages/:id` — Update page content (admin only)
- `PUT /api/v1/pages/:id/publish` — Publish page (admin only)
- `DELETE /api/v1/pages/:id` — Delete page (admin only)

### Layer 4: Admin (`packages/admin`)

**New app route: `app/pages/`**

- `page.tsx` — Pages list (title, slug, status, actions)
- `[id]/page.tsx` — Page editor with Craft.js
- `new/page.tsx` — Create new page

**Craft.js Editor Components (in `components/page-builder/`):**

- `editor.tsx` — Main editor wrapper (Craft.js `<Editor>`, toolbar, sidebar)
- `toolbar.tsx` — Top bar (save, publish, preview, undo/redo, device preview)
- `component-panel.tsx` — Left sidebar with draggable blocks
- `settings-panel.tsx` — Right sidebar for selected component props
- `render-node.tsx` — Custom Craft.js RenderNode (drag handles, selection UI)

### Layer 5: Storefront (`packages/storefront`)

**New route: `app/[...slug]/page.tsx`** (catch-all for dynamic pages)

- Fetches page by slug from API
- Renders Craft.js content using resolver components (NO editor, just render)
- Server-side rendered for SEO

**Renderer: `components/page-builder/renderer.tsx`**

- Takes JSON content, renders React components
- No Craft.js dependency in storefront bundle (just maps JSON → components)
- Same component set as admin, but render-only versions

## Commerce Blocks (Shared between admin + storefront)

Located in `packages/shared/src/page-builder/blocks/` — pure React, no editor deps.

### Layout Blocks

1. **Container** — Flex/grid wrapper, padding, max-width, background color/image
2. **Columns** — 2/3/4 column layouts, responsive breakpoints
3. **Section** — Full-width section with background (color, image, gradient)
4. **Spacer** — Vertical spacing (xs/sm/md/lg/xl)

### Content Blocks

5. **Heading** — H1-H6 with alignment, color
6. **Text** — Rich text (Markdown rendered)
7. **Image** — Single image with alt, link, aspect ratio, from media library
8. **Button** — CTA button with variants (primary, secondary, outline), link
9. **Video** — YouTube/Vimeo embed or self-hosted

### Commerce Blocks

10. **ProductGrid** — Grid of products (by category, tag, manual selection, or latest)
11. **ProductCarousel** — Horizontal scrolling product cards
12. **FeaturedProduct** — Single product hero with image, description, add-to-cart
13. **CategoryGrid** — Grid of category cards with images
14. **SaleBanner** — Countdown timer, discount code, CTA
15. **Newsletter** — Email signup form
16. **Testimonials** — Customer reviews carousel

### Pre-built Templates

- **Homepage** — Hero + Categories + Featured Products + Testimonials + Newsletter
- **Landing Page** — Hero + Features + CTA + Social Proof
- **About Us** — Image + Text sections
- **Contact** — Contact info + Form (future)

## Key Principles

1. **No Craft.js in storefront bundle** — Admin uses Craft.js for editing, storefront renders from JSON with a lightweight renderer. This keeps the storefront fast.
2. **Server-renderable** — All blocks render as standard React/HTML. No client-side JS needed for display.
3. **JSON-first** — Page content is a JSON tree in the DB. Clean, versionable, translatable.
4. **Same component library** — Admin editor and storefront renderer use the SAME React components. No divergence.
5. **Commerce-aware** — Blocks can fetch live data (products, categories) at render time.
6. **Mobile-first** — All blocks are responsive. Device preview in editor.
7. **Accessible** — Semantic HTML, ARIA attributes, keyboard navigation in editor.
8. **No hacks** — Follows the exact same module pattern as every other ForkCart feature.

## Component Structure for Craft.js

Each block has:

```typescript
// The visual component (renders in both admin + storefront)
export function HeroBlock({ title, subtitle, image, ctaText, ctaLink }: HeroBlockProps) {
  return <section>...</section>;
}

// Craft.js configuration (admin only)
HeroBlock.craft = {
  displayName: 'Hero Banner',
  props: { title: 'Your Store', subtitle: 'Welcome', ... },
  related: {
    settings: HeroBlockSettings, // Right-panel editor
  },
};
```

## Implementation Order

1. DB schema + migration
2. Core service + repository
3. API routes
4. Storefront renderer (JSON → React, no Craft.js dep)
5. Admin editor (Craft.js integration)
6. Commerce blocks (one by one)
7. Templates
8. Page translations (i18n)
