import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve, relative } from 'node:path';
import type { Database } from '@forkcart/database';
import {
  ProductRepository,
  ProductService,
  CategoryRepository,
  CategoryService,
  OrderRepository,
  OrderService,
  CustomerRepository,
  CustomerService,
  MediaRepository,
  MediaService,
  CartRepository,
  CartService,
  PaymentRepository,
  PaymentService,
  PaymentProviderRegistry,
  UserRepository,
  AuthService,
  EventBus,
  PluginLoader,
} from '@forkcart/core';
import { stripePlugin } from '@forkcart/plugin-stripe';
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
import { createPluginRoutes } from './routes/v1/plugins';

/** Create the Hono application with all routes and middleware */
export async function createApp(db: Database) {
  const app = new Hono();

  // Global middleware
  app.use('*', honoLogger());
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: (process.env['API_CORS_ORIGIN'] ?? 'http://localhost:3000').split(','),
      credentials: true,
    }),
  );

  // Error handling
  app.onError(errorHandler);

  // Media storage config
  const storagePath = resolve(process.env['MEDIA_STORAGE_PATH'] ?? './uploads');
  const baseUrl = process.env['MEDIA_BASE_URL'] ?? 'http://localhost:4000/uploads';

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

  // Initialize payment provider registry
  const paymentProviderRegistry = new PaymentProviderRegistry();

  // Initialize services with dependency injection
  const productService = new ProductService({ productRepository, eventBus });
  const categoryService = new CategoryService({ categoryRepository, eventBus });
  const orderService = new OrderService({ orderRepository, eventBus });
  const customerService = new CustomerService({ customerRepository, eventBus });
  const mediaService = new MediaService({ mediaRepository, eventBus, storagePath, baseUrl });
  const cartService = new CartService({ cartRepository, eventBus });
  const paymentService = new PaymentService({
    paymentRepository,
    paymentProviderRegistry,
    cartRepository,
    orderRepository,
    customerRepository,
    eventBus,
  });

  const jwtSecret = process.env['SESSION_SECRET'] ?? '';
  const authService = new AuthService(userRepository, jwtSecret);

  // Initialize plugin loader and register built-in plugins
  const pluginLoader = new PluginLoader(db, paymentProviderRegistry);
  pluginLoader.registerDefinition(stripePlugin);
  // Future: pluginLoader.registerDefinition(paypalPlugin);

  // Load active plugins from DB
  await pluginLoader.loadActivePlugins();

  // Auth middleware — protects all routes except /health and /auth/login
  app.use('*', createAuthMiddleware(authService));

  // Mount v1 routes
  const v1 = new Hono();
  v1.route('/auth', createAuthRoutes(authService));
  v1.route('/products', createProductRoutes(productService));
  v1.route('/categories', createCategoryRoutes(categoryService));
  v1.route('/orders', createOrderRoutes(orderService));
  v1.route('/customers', createCustomerRoutes(customerService));
  v1.route('/media', createMediaRoutes(mediaService));
  v1.route('/products', createProductImageRoutes(mediaService));
  v1.route('/carts', createCartRoutes(cartService));
  v1.route('/payments', createPaymentRoutes(paymentService));
  v1.route('/payments/webhook', createWebhookRoute(paymentService));
  v1.route('/plugins', createPluginRoutes(pluginLoader));

  app.route('/api/v1', v1);

  // 404 fallback
  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

  return app;
}
