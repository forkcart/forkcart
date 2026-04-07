import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve, relative, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import type { Database } from '@forkcart/database';
import { AIProviderRegistry } from '@forkcart/ai';
import {
  ProductRepository,
  ProductService,
  CategoryRepository,
  CategoryService,
  OrderRepository,
  OrderService,
  CustomerRepository,
  CustomerService,
  CustomerAuthService,
  MediaRepository,
  MediaService,
  CartRepository,
  CartService,
  PaymentRepository,
  PaymentService,
  PaymentProviderRegistry,
  UserRepository,
  AuthService,
  ShippingRepository,
  ShippingService,
  ShippingProviderRegistry,
  ChatSessionRepository,
  ChatbotSettingsRepository,
  ChatbotService,
  EventBus,
  PluginLoader,
  PluginScheduler,
  EmailProviderRegistry,
  EmailLogRepository,
  EmailService,
  registerEmailEventListeners,
  TaxRepository,
  TaxService,
  VatValidator,
  SearchRepository,
  SearchService,
  RankingService,
  TranslationRepository,
  TranslationService,
  ProductTranslationRepository,
  ProductTranslationService,
  CouponRepository,
  CouponService,
  WishlistRepository,
  WishlistService,
  ProductReviewRepository,
  ProductReviewService,
  PageRepository,
  PageService,
  PageTranslationRepository,
  PageTranslationService,
  CurrencyRepository,
  CurrencyService,
  VariantRepository,
  VariantService,
  AttributeRepository,
  AttributeService,
  MarketplaceService,
  MarketplaceProviderRegistry,
  PluginStoreService,
} from '@forkcart/core';
import {
  AISettingsRepository,
  ProductAIService,
  SeoRepository,
  SeoService,
  MobileAppRepository,
  MobileAppService,
} from '@forkcart/core';
import { LogEmailProvider } from '@forkcart/core';

import { errorHandler } from './middleware/error-handler';
import { createAuthMiddleware } from './middleware/auth';
import { createAuthRoutes } from './routes/v1/auth';
import { createProductRoutes } from './routes/v1/products';
import { createCategoryRoutes } from './routes/v1/categories';
import { createOrderRoutes } from './routes/v1/orders';
import { createCustomerRoutes } from './routes/v1/customers';
import { createMediaRoutes } from './routes/v1/media';
import { createProductImageRoutes } from './routes/v1/product-images';
import { createCartRoutes } from './routes/v1/carts';
import { createPaymentRoutes, createWebhookRoute } from './routes/v1/payments';
import {
  createPluginRoutes,
  createPublicPluginRoutes,
  mountPluginRoutes,
} from './routes/v1/plugins';
import { createEmailRoutes } from './routes/v1/emails';
import { createShippingRoutes } from './routes/v1/shipping';
import { createChatRoutes, createChatAdminRoutes } from './routes/v1/chat';
import { createTaxRoutes } from './routes/v1/tax';
import {
  createCustomerAuthRoutes,
  createCartAssignRoute,
  createPostPurchaseRegisterRoute,
} from './routes/v1/customer-auth';
import { createStorefrontCustomerRoutes } from './routes/v1/storefront-customers';
import {
  createSearchRoutes,
  createSearchAdminRoutes,
  createPublicSearchRoutes,
} from './routes/v1/search';
import { createAIRoutes } from './routes/v1/ai';
import { createSeoRoutes, createPublicSeoRoutes } from './routes/v1/seo';
import { createTranslationRoutes, createPublicTranslationRoutes } from './routes/v1/translations';
import { createProductTranslationRoutes } from './routes/v1/product-translations';
import { createCacheRoutes } from './routes/v1/cache';
import { createCouponRoutes, createPublicCouponRoutes } from './routes/v1/coupons';
import { createWishlistRoutes } from './routes/v1/wishlists';
import { createProductReviewRoutes, createAdminReviewRoutes } from './routes/v1/reviews';
import { createUserRoutes } from './routes/v1/users';
import { createPageRoutes } from './routes/v1/pages';
import { createPageTranslationRoutes } from './routes/v1/page-translations';
import { createCurrencyRoutes, createPublicCurrencyRoutes } from './routes/v1/currencies';
import { createThemeSettingsRoutes } from './routes/v1/theme-settings';
import { createVariantRoutes } from './routes/v1/variants';
import { createAttributeRoutes } from './routes/v1/attributes';
import { createPublicVariantRoutes } from './routes/v1/public-variants';
import { createMobileAppRoutes } from './routes/v1/mobile-app';
import { createMarketplaceRoutes } from './routes/v1/marketplace';
import { createPluginStoreRoutes } from './routes/v1/plugin-store';
import {
  createCookieConsentRoutes,
  createPublicCookieConsentRoutes,
} from './routes/v1/cookie-consent';
import { createSystemRoutes } from './routes/v1/system';
import { createUpdateRoutes } from './routes/v1/updates';
import { createProductCSVRoutes } from './routes/v1/product-csv';
import { createOrderCSVRoutes } from './routes/v1/order-csv';
import { createDbBackupRoutes } from './routes/v1/db-backup';
import { createApiKeyRoutes } from './routes/v1/api-keys';
import { createOpenApiRoutes } from './routes/v1/openapi';
import { createApiKeyMiddleware } from './middleware/api-key';
import { requireRole } from './middleware/permissions';
import { rateLimit } from './middleware/rate-limit';
import { autoCacheInvalidation } from './middleware/cache-invalidation';
import { csrf } from './middleware/csrf';
import { flattenTranslations } from '@forkcart/i18n';
import { readFileSync, readdirSync } from 'node:fs';
import './middleware/i18n'; // registers locale on ContextVariableMap

/** Create the Hono application with all routes and middleware */
export async function createApp(db: Database) {
  // RVS-014: Reject known default/insecure session secrets
  const sessionSecret = process.env['SESSION_SECRET'] ?? '';
  const insecureSecrets = [
    'change-me-in-production',
    'change-me-to-a-random-string-at-least-32-chars',
    'CHANGE_ME_GENERATE_SECURE_SECRET',
    '',
  ];
  if (insecureSecrets.includes(sessionSecret) || sessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing, too short (<32 chars), or uses a known default value. ' +
        'Generate a secure secret with: openssl rand -base64 48',
    );
  }

  const app = new Hono();

  // Global middleware
  app.use('*', honoLogger());

  // ForkCart identification header
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Powered-By', 'ForkCart');
  });

  /**
   * RVS-030: Secure Headers with Content Security Policy
   *
   * This is a baseline CSP suitable for development and initial production.
   * For stricter production environments, consider:
   *   - Removing 'unsafe-inline' and 'unsafe-eval' from script-src (use nonces/hashes)
   *   - Restricting connect-src to specific API domains
   *   - Adding report-uri or report-to for CSP violation reporting
   */
  app.use(
    '*',
    secureHeaders({
      crossOriginResourcePolicy: 'cross-origin',
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js dev requires unsafe-eval
        styleSrc: ["'self'", "'unsafe-inline'"], // CSS-in-JS libs often need unsafe-inline
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https:'],
        frameSrc: ["'self'"], // Payment embeds may need specific domains
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    }),
  );
  app.use(
    '*',
    cors({
      origin: (process.env['API_CORS_ORIGIN'] ?? 'http://localhost:3000').split(','),
      credentials: true,
    }),
  );

  // CSRF protection (Double-Submit Cookie pattern)
  const corsOrigins = (process.env['API_CORS_ORIGIN'] ?? 'http://localhost:3000').split(',');
  app.use('*', csrf(corsOrigins));

  // i18n: parse Accept-Language header, set locale on request context
  app.use('*', async (c, next) => {
    const acceptLang = c.req.header('Accept-Language');
    const supported = ['en', 'de'];
    let locale = 'en';
    if (acceptLang) {
      const langs = acceptLang
        .split(',')
        .map((p) => {
          const [lang, qp] = p.trim().split(';');
          return { lang: lang!.split('-')[0]!, q: qp ? parseFloat(qp.replace('q=', '')) : 1 };
        })
        .sort((a, b) => b.q - a.q);
      for (const { lang } of langs) {
        if (supported.includes(lang)) {
          locale = lang;
          break;
        }
      }
    }
    c.set('locale', locale);
    await next();
  });

  // Error handling
  app.onError(errorHandler);

  // Media storage config
  const storagePath = resolve(process.env['MEDIA_STORAGE_PATH'] ?? './uploads');
  const baseUrl = process.env['MEDIA_BASE_URL'] ?? 'http://localhost:4000/uploads';

  // Ensure uploads directory exists
  if (!existsSync(storagePath)) {
    mkdirSync(storagePath, { recursive: true });
    console.log(`[media] Created uploads directory: ${storagePath}`);
  }

  // Static file serving for uploads — resolve relative to CWD for serveStatic
  const relativeStoragePath = relative(process.cwd(), storagePath);
  app.use(
    '/uploads/*',
    serveStatic({
      root: relativeStoragePath,
      rewriteRequestPath: (path) => path.replace('/uploads', ''),
    }),
  );

  // Health check
  app.get('/health', (c) =>
    c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }),
  );

  // Initialize shared event bus
  const eventBus = new EventBus();

  // Initialize repositories
  const productRepository = new ProductRepository(db);
  const categoryRepository = new CategoryRepository(db);
  const orderRepository = new OrderRepository(db);
  const customerRepository = new CustomerRepository(db);
  const mediaRepository = new MediaRepository(db);
  const cartRepository = new CartRepository(db);
  const paymentRepository = new PaymentRepository(db);
  const userRepository = new UserRepository(db);
  const shippingRepository = new ShippingRepository(db);
  const couponRepository = new CouponRepository(db);
  const wishlistRepository = new WishlistRepository(db);
  const pageRepository = new PageRepository(db);
  const productReviewRepository = new ProductReviewRepository(db);
  const variantRepository = new VariantRepository(db);
  const attributeRepository = new AttributeRepository(db);
  const currencyRepository = new CurrencyRepository(db);
  const mobileAppRepository = new MobileAppRepository(db);

  // Initialize payment provider registry
  const paymentProviderRegistry = new PaymentProviderRegistry();

  // Initialize marketplace provider registry
  const marketplaceProviderRegistry = new MarketplaceProviderRegistry();

  // Initialize shipping provider registry
  const shippingProviderRegistry = new ShippingProviderRegistry();

  // Initialize services with dependency injection
  // Note: pluginLoader injected below after initialization
  const productService = new ProductService({ productRepository, eventBus, pluginLoader: null });
  const categoryService = new CategoryService({ categoryRepository, eventBus });
  const orderService = new OrderService({ orderRepository, variantRepository, eventBus });
  const customerService = new CustomerService({ customerRepository, eventBus });
  const mediaService = new MediaService({ mediaRepository, eventBus, storagePath, baseUrl });
  // productTranslationService injected below after it's created
  const cartService = new CartService({
    cartRepository,
    eventBus,
    productTranslationService: null,
    mediaBaseUrl: baseUrl,
  });
  const shippingService = new ShippingService({ shippingRepository, eventBus });

  const paymentService = new PaymentService({
    paymentRepository,
    paymentProviderRegistry,
    cartRepository,
    orderRepository,
    customerRepository,
    eventBus,
    shippingService,
  });
  const couponService = new CouponService({ couponRepository });
  const wishlistService = new WishlistService({ wishlistRepository });
  const pageService = new PageService({ pageRepository, eventBus });

  // Page translations
  const pageTranslationRepository = new PageTranslationRepository(db);
  const pageTranslationService = new PageTranslationService({
    pageTranslationRepository,
  });
  const productReviewService = new ProductReviewService({ productReviewRepository });
  const variantService = new VariantService({ variantRepository });
  const attributeService = new AttributeService({ attributeRepository });
  const currencyService = new CurrencyService({ currencyRepository });

  // Mobile app builder
  const mobileTemplatePath = resolve(process.cwd(), '../mobile');
  const mobileAppService = new MobileAppService({
    mobileAppRepository,
    templatePath: mobileTemplatePath,
    mediaStoragePath: storagePath,
  });

  // Marketplace service
  const marketplaceService = new MarketplaceService({
    db,
    registry: marketplaceProviderRegistry,
  });

  // Plugin store service (pluginLoader injected below after initialization)
  let pluginStoreService: PluginStoreService;

  // Product translations
  const productTranslationRepository = new ProductTranslationRepository(db);
  const productTranslationService = new ProductTranslationService({
    productTranslationRepository,
    getProduct: async (id: string) => {
      const p = await productRepository.findById(id);
      if (!p) return null;
      return {
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
      };
    },
  });

  // Inject product translations into cart service (late binding — both created now)
  cartService.setProductTranslationService(productTranslationService);

  // i18n translations
  const translationRepository = new TranslationRepository(db);
  // Load i18n JSON file defaults
  const i18nFileDefaults: Record<string, Record<string, string>> = {};
  try {
    const localesDir = resolve(new URL('.', import.meta.url).pathname, '../../i18n/locales');
    const files = readdirSync(localesDir).filter(
      (f) => f.endsWith('.json') && !f.startsWith('admin-'),
    );
    for (const file of files) {
      const locale = file.replace('.json', '');
      const raw = JSON.parse(readFileSync(join(localesDir, file), 'utf-8'));
      i18nFileDefaults[locale] = flattenTranslations(raw);
    }
    console.log(`[i18n] Loaded defaults for: ${Object.keys(i18nFileDefaults).join(', ')}`);
  } catch (err) {
    console.warn('[i18n] Could not load locale files — translation manager will show 0 keys', err);
  }

  const translationService = new TranslationService({
    translationRepository,
    fileDefaults: i18nFileDefaults,
  });

  // Search system
  const searchRepository = new SearchRepository(db);
  const rankingService = new RankingService(db);
  const searchService = new SearchService({
    searchRepository,
    rankingService,
    eventBus,
    aiService: null, // AI provider injected externally when configured
    mediaBaseUrl: baseUrl.replace(/\/uploads\/?$/, ''),
    db,
  });

  // Tax system
  const taxRepository = new TaxRepository(db);
  const vatValidator = new VatValidator();
  const taxService = new TaxService({
    taxRepository,
    vatValidator,
    eventBus,
    getProductTaxClassId: async (productId: string) => {
      const product = await productRepository.findById(productId);
      return ((product as Record<string, unknown>)?.['taxClassId'] as string | null) ?? null;
    },
  });

  const jwtSecret = process.env['SESSION_SECRET'] ?? '';
  const authService = new AuthService(userRepository, jwtSecret);

  // Initialize email provider registry and service
  const emailProviderRegistry = new EmailProviderRegistry();
  const emailLogRepository = new EmailLogRepository(db);
  const emailService = new EmailService({
    emailRegistry: emailProviderRegistry,
    emailLogRepository,
  });

  // Customer auth uses a separate secret (falls back to SESSION_SECRET with prefix)
  const customerJwtSecret = process.env['CUSTOMER_JWT_SECRET'] ?? `customer_${jwtSecret}`;
  const customerAuthService = new CustomerAuthService({
    customerRepository,
    eventBus,
    jwtSecret: customerJwtSecret,
    emailService,
    storefrontUrl: process.env['STOREFRONT_URL'] ?? 'http://localhost:3000',
  });

  // Initialize plugin loader and register built-in plugins
  const pluginLoader = new PluginLoader(
    db,
    paymentProviderRegistry,
    emailProviderRegistry,
    marketplaceProviderRegistry,
    shippingProviderRegistry,
    eventBus,
  );
  // Discover plugins from node_modules (no hardcoded imports)
  await pluginLoader.discoverPlugins();

  // Initialize plugin store service with plugin loader
  pluginStoreService = new PluginStoreService({ db, pluginLoader });

  // Load active plugins from DB
  await pluginLoader.loadActivePlugins();

  // Initialize and start the plugin scheduler for cron tasks
  const pluginScheduler = new PluginScheduler(pluginLoader);
  await pluginScheduler.start();

  // Inject PluginLoader into services for filter support
  productService.setPluginLoader(pluginLoader);
  searchService.setPluginLoader(pluginLoader);
  cartService.setPluginLoader(pluginLoader);
  paymentService.setPluginLoader(pluginLoader);
  shippingService.setPluginLoader(pluginLoader);
  taxService.setPluginLoader(pluginLoader);

  // Register log email provider as fallback for development
  // It auto-activates only if no other provider is already active
  if (!emailProviderRegistry.getActiveProvider()) {
    const logProvider = new LogEmailProvider();
    await logProvider.initialize({});
    emailProviderRegistry.register(logProvider);
  }

  // Register email event listeners (order confirmation, shipping, welcome)
  registerEmailEventListeners(eventBus, emailService);

  // Initialize AI provider registry (new system — settings from DB)
  const aiProviderRegistry = new AIProviderRegistry();
  const aiSettingsRepository = new AISettingsRepository(db);
  const storedAISettings = await aiSettingsRepository.get();
  if (storedAISettings) {
    aiProviderRegistry.configure(storedAISettings);
  }
  const productAIService = new ProductAIService({ aiRegistry: aiProviderRegistry });

  // Wire AI provider to translation service for auto-translate
  const configuredAI = aiProviderRegistry.getConfiguredProvider();
  if (configuredAI) {
    translationService.setAIProvider(configuredAI);
    productTranslationService.setAIProvider(configuredAI);
  }

  // SEO service (works without AI, enhanced when AI is available)
  const seoRepository = new SeoRepository(db);
  const seoService = new SeoService({
    seoRepository,
    eventBus,
    aiProvider: null, // TODO: wire AI provider when registry supports generateText
    baseUrl: process.env['STOREFRONT_URL'] ?? 'http://localhost:3000',
  });

  // Initialize chatbot (uses the same AI registry as product AI features)
  const chatSessionRepository = new ChatSessionRepository(db);
  const chatbotSettingsRepository = new ChatbotSettingsRepository(db);
  const chatbotService = new ChatbotService({
    chatSessionRepository,
    chatbotSettingsRepository,
    aiProvider: aiProviderRegistry.getConfiguredProvider(),
    eventBus,
    getContext: async () => {
      const productList = await productRepository.findMany(
        { status: 'active', sortBy: 'name', sortDirection: 'asc' },
        { page: 1, limit: 50 },
      );
      const shippingList = await shippingRepository.findActive();
      return {
        shopName: process.env['SHOP_NAME'] ?? 'ForkCart Shop',
        products: productList.data.slice(0, 50).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          inStock: p.status === 'active',
        })),
        shippingMethods: shippingList.map((s) => ({
          name: s.name,
          price: s.price,
          estimatedDays: s.estimatedDays ?? undefined,
        })),
      };
    },
  });

  // RVS-016: Rate limiting
  app.use('/api/v1/auth/login', rateLimit('login', 5)); // 5/min
  app.use('/api/v1/customer-auth/login', rateLimit('customer-login', 5));
  app.use('/api/v1/customer-auth/register', rateLimit('customer-register', 5));
  app.use('/api/v1/customer-auth/forgot-password', rateLimit('forgot-pw', 3));
  app.use('/api/v1/customer-auth/guest-register', rateLimit('guest-register', 5));
  app.use('/api/v1/payments/*', rateLimit('payments', 10)); // 10/min
  app.use('/api/v1/public/search/*', rateLimit('search', 60)); // 60/min
  app.use('/api/v1/search/*', rateLimit('search-admin', 60));
  // Public storefront endpoints — no rate limit (SSR + client hydration = too many requests)
  // Rate limiting should be handled at the reverse proxy (Caddy/nginx) level instead
  // app.use('/api/v1/public/*', rateLimit('public', 500));
  // Global rate limit — skip for /public/* (already covered above)
  app.use('/api/v1/*', async (c, next) => {
    if (c.req.path.startsWith('/api/v1/public/')) return next();
    return rateLimit('global', 200)(c, next);
  });

  // API Key middleware — checks X-Api-Key / Bearer fc_live_... BEFORE JWT auth
  // If valid key found, sets c.user so JWT middleware skips
  app.use('*', createApiKeyMiddleware(db));

  // Auth middleware — protects all routes except /health and /auth/login
  app.use('*', createAuthMiddleware(authService));

  // Auto-invalidate storefront cache on admin mutations
  app.use('/api/v1/*', autoCacheInvalidation());

  // Mount v1 routes
  const v1 = new Hono();

  // ─── Role-based access control ──────────────────────────────────────────────
  // Plugins, emails, AI, settings, search analytics → admin + superadmin
  v1.use('/plugins/*', requireRole('admin', 'superadmin'));
  v1.use('/emails/*', requireRole('admin', 'superadmin'));
  v1.use('/ai/*', requireRole('admin', 'superadmin'));
  v1.use('/mobile-app/*', requireRole('admin', 'superadmin'));
  v1.use('/search/analytics/*', requireRole('admin', 'superadmin'));
  v1.use('/search/zero-results', requireRole('admin', 'superadmin'));
  v1.use('/marketplace/*', requireRole('admin', 'superadmin'));

  v1.route('/auth', createAuthRoutes(authService));
  v1.route(
    '/products',
    createProductRoutes(
      productService,
      mediaService,
      productTranslationService,
      translationService,
    ),
  );
  v1.route('/categories', createCategoryRoutes(categoryService));
  v1.route('/orders', createOrderRoutes(orderService));
  v1.route('/orders/csv', createOrderCSVRoutes(db));
  v1.route('/customers', createCustomerRoutes(customerService));
  v1.route('/media', createMediaRoutes(mediaService));
  v1.route('/products', createProductImageRoutes(mediaService));
  v1.route('/carts', createCartRoutes(cartService));
  v1.route('/payments', createPaymentRoutes(paymentService));
  v1.route('/payments/webhook', createWebhookRoute(paymentService));
  v1.route('/plugins', createPluginRoutes(pluginLoader, pluginScheduler));
  v1.route('/emails', createEmailRoutes(emailService));
  v1.route('/shipping', createShippingRoutes(shippingService));
  v1.route('/chat', createChatRoutes(chatbotService));
  v1.route('/chat/admin', createChatAdminRoutes(chatbotService));
  v1.route('/tax', createTaxRoutes(taxService));
  v1.route('/search', createSearchRoutes(searchService));
  v1.route('/search', createSearchAdminRoutes(searchService));
  v1.route(
    '/ai',
    createAIRoutes(aiProviderRegistry, aiSettingsRepository, productAIService, productService),
  );
  v1.route('/seo', createSeoRoutes(seoService));
  v1.route('/translations', createTranslationRoutes(translationService));
  v1.route('/cache', createCacheRoutes());
  v1.route('/coupons', createCouponRoutes(couponService));
  v1.route('/reviews', createAdminReviewRoutes(productReviewService));
  v1.route('/users', createUserRoutes(authService));
  v1.route('/pages', createPageRoutes(pageService));
  v1.route('/pages', createPageTranslationRoutes(pageTranslationService));
  v1.route('/theme-settings', createThemeSettingsRoutes(db));
  v1.route('/currencies', createCurrencyRoutes(currencyService));
  v1.route('/products', createProductTranslationRoutes(productTranslationService));
  v1.route('/products', createVariantRoutes(variantService));
  v1.route('/products/csv', createProductCSVRoutes(db));
  v1.route('/attributes', createAttributeRoutes(attributeService));
  v1.route('/mobile-app', createMobileAppRoutes(mobileAppService));
  v1.route('/marketplace', createMarketplaceRoutes(marketplaceService));
  v1.route('/store', createPluginStoreRoutes(pluginStoreService, pluginLoader as never));
  v1.route('/cookie-consent', createCookieConsentRoutes(db));
  v1.route('/system', createSystemRoutes());
  v1.route('/system/updates', createUpdateRoutes());
  v1.route('/system/backups', createDbBackupRoutes());
  v1.route('/api-keys', createApiKeyRoutes(db));
  v1.route('/customer-auth', createCustomerAuthRoutes(customerAuthService));
  v1.route('/customer-auth', createPostPurchaseRegisterRoute(customerAuthService, orderRepository));
  v1.route('/carts', createCartAssignRoute(cartService, customerAuthService));
  v1.route(
    '/storefront/customers',
    createStorefrontCustomerRoutes(customerAuthService, customerRepository, orderRepository),
  );

  // Public translations API (no auth — must be mounted BEFORE /api/v1 to avoid auth middleware)
  app.route('/api/v1/public/translations', createPublicTranslationRoutes(translationService));

  // Wishlist routes (customer auth — mounted publicly to avoid admin auth)
  app.route(
    '/api/v1/public/wishlists',
    createWishlistRoutes(wishlistService, productService, customerAuthService),
  );

  // Public product review routes (get = public, post = customer auth)
  app.route(
    '/api/v1/public/products',
    createProductReviewRoutes(productReviewService, customerAuthService),
  );

  // Public coupon routes (no auth)
  app.route('/api/v1/public/coupons', createPublicCouponRoutes(couponService));

  // Public search routes (no auth — instant search, popular, trending, tracking)
  app.route('/api/v1/public/search', createPublicSearchRoutes(searchService));

  // Public currency routes (no auth)
  app.route('/api/v1/public/currencies', createPublicCurrencyRoutes(currencyService));

  // Public variant routes (no auth — storefront needs to fetch variants)
  app.route('/api/v1/public/products', createPublicVariantRoutes(variantService, attributeService));

  // Public plugin routes (no auth — storefront slots)
  app.route('/api/v1/public/plugins', createPublicPluginRoutes(pluginLoader));

  // Public plugin store routes (no auth — browsing the store)
  app.route(
    '/api/v1/public/store',
    createPluginStoreRoutes(pluginStoreService, pluginLoader as never),
  );

  // Public cookie consent routes (no auth — storefront banner config + logging)
  app.route('/api/v1/public/cookie-consent', createPublicCookieConsentRoutes(db));

  // Mount plugin custom routes under /api/v1/public/plugins/<pluginName>/
  // NOTE: Plugin routes are public (no auth) to allow storefront JS to call them
  // Security is handled per-plugin (plugins can add their own auth if needed)
  mountPluginRoutes(app, pluginLoader, '/api/v1/public');

  app.route('/api/v1', v1);

  // OpenAPI spec (public, no auth)
  app.route('/api/v1/openapi.json', createOpenApiRoutes());

  // Public SEO routes (sitemap.xml, robots.txt) — no auth required
  const publicSeoRoutes = createPublicSeoRoutes(seoService);
  app.route('/', publicSeoRoutes);

  // 404 fallback
  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

  // ─── Scheduled exchange rate updates (every 6 hours) ────────────────────────
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const hasAuto = await currencyService.hasAutoUpdateCurrencies();
      if (!hasAuto) return;

      console.log('[exchange-rates] Refreshing auto-update currencies...');
      const results = await currencyService.refreshRates();
      const updated = results.filter((r) => r.updated);
      if (updated.length > 0) {
        console.log(
          `[exchange-rates] Updated ${updated.length} currencies:`,
          updated.map((r) => `${r.code}: ${r.oldRate} → ${r.newRate}`).join(', '),
        );
      } else {
        console.log('[exchange-rates] No currencies needed updating.');
      }
    } catch (err) {
      console.error('[exchange-rates] Failed to refresh rates:', err);
    }
  }, SIX_HOURS);

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('[app] Shutting down...');
    pluginScheduler.stop();
    console.log('[app] Plugin scheduler stopped');
  };

  // Register shutdown handlers
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}
