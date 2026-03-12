import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Database } from '@forkcart/database';
import { ProductRepository, ProductService, CategoryRepository, CategoryService, EventBus } from '@forkcart/core';
import { errorHandler } from './middleware/error-handler.js';
import { createProductRoutes } from './routes/v1/products.js';
import { createCategoryRoutes } from './routes/v1/categories.js';

/** Create the Hono application with all routes and middleware */
export function createApp(db: Database) {
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

  // Health check
  app.get('/health', (c) =>
    c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }),
  );

  // Initialize shared event bus
  const eventBus = new EventBus();

  // Initialize repositories
  const productRepository = new ProductRepository(db);
  const categoryRepository = new CategoryRepository(db);

  // Initialize services with dependency injection
  const productService = new ProductService({ productRepository, eventBus });
  const categoryService = new CategoryService({ categoryRepository, eventBus });

  // Mount v1 routes
  const v1 = new Hono();
  v1.route('/products', createProductRoutes(productService));
  v1.route('/categories', createCategoryRoutes(categoryService));

  app.route('/api/v1', v1);

  // 404 fallback
  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404),
  );

  return app;
}
