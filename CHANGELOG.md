# Changelog

All notable changes to ForkCart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-04-09

### Added

- Comprehensive API test suite (410 tests covering auth, products, carts, orders, updates)
- CSV export for orders and products
- Database backup endpoint
- Auto-update system with SHA256 checksum verification and URL validation
- ForkCart generator meta tag and X-Powered-By header
- API Key authentication with per-key rate limiting
- OpenAPI 3.0 specification endpoint

### Fixed

- Auto-update security hardening (URL validation, SHA256 checksum, 20min timeout)
- Plugin store works out-of-the-box after fresh install

### Changed

- Improved web installer with shop config validation and build error logging

## [0.1.1] - 2026-03-26

### Added

- Plugin SDK with typed permissions (18 permission types)
- Plugin lifecycle hooks (onActivate, onDeactivate, onInstall, onUninstall, onUpdate, onReady, onError)
- Event Bus with filters (WordPress-style hooks)
- Plugin circuit breaker (auto-deactivation after 5 errors in 5 minutes)
- Scoped database for plugin isolation
- Plugin migration runner
- Hot reload for plugin development (FSWatcher)
- Drag & Drop Page Builder with 29 block types (Craft.js)
- AI integration (OpenAI, Anthropic, Gemini, OpenRouter)
- Mobile app package (Expo/React Native)
- Marketplace integrations (Amazon, eBay, Otto, Kaufland)
- Stripe payment plugin with webhook verification
- Email system (Mailgun, SMTP) with event-driven templates
- Tax zones with EU VAT validation
- Shipping zones (weight/value-based)
- Smart search with CTR/conversion ranking
- CSRF protection (Double-Submit Cookie)
- Rate limiting (sliding window, per-bucket)
- AES-256-GCM encryption for plugin secrets
- RBAC, wishlists, product reviews, SEO metadata
- Cookie consent (GDPR compliant, multilingual)
- Internationalization (de, en) with URL-based locale routing
- Guest and authenticated checkout
- Coupon system (percentage, fixed, free shipping, per-customer limits)
- Order lifecycle management

## [0.1.0] - 2026-03-12

### Added

- Initial release
- Full monorepo setup (admin, api, core, storefront, database, shared, i18n, ai, cli, mobile, plugin-sdk, installer, create-forkcart)
- Product management with variants, options, categories, image galleries
- Next.js 16 admin panel and storefront
- Hono API with PostgreSQL (Drizzle ORM)
- Docker Compose configuration
- CI/CD with GitHub Actions
- `npx create-forkcart` installer
- MIT License
