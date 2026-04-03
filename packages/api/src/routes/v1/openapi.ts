import { Hono } from 'hono';

/**
 * OpenAPI 3.0 spec generated from known routes.
 * Public endpoint — no auth required.
 */
export function createOpenApiRoutes() {
  const router = new Hono();

  router.get('/', (c) => {
    const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:4000';

    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'ForkCart API',
        version: '1.0.0',
        description:
          'ForkCart headless commerce API. Supports JWT and API Key authentication. Use X-Api-Key header or Authorization: Bearer fc_live_... for API key auth.',
      },
      servers: [{ url: baseUrl, description: 'ForkCart API Server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http' as const,
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Admin JWT token from /api/v1/auth/login',
          },
          apiKeyHeader: {
            type: 'apiKey' as const,
            in: 'header' as const,
            name: 'X-Api-Key',
            description: 'API key (format: fc_live_ + 32 hex chars)',
          },
        },
        schemas: {
          Error: {
            type: 'object' as const,
            properties: {
              error: {
                type: 'object' as const,
                properties: {
                  code: { type: 'string' as const },
                  message: { type: 'string' as const },
                },
              },
            },
          },
          Product: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const, format: 'uuid' },
              name: { type: 'string' as const },
              slug: { type: 'string' as const },
              description: { type: 'string' as const },
              price: { type: 'number' as const },
              compareAtPrice: { type: 'number' as const, nullable: true },
              sku: { type: 'string' as const },
              status: {
                type: 'string' as const,
                enum: ['active', 'draft', 'archived'],
              },
              stock: { type: 'integer' as const },
              categoryId: { type: 'string' as const, format: 'uuid', nullable: true },
              createdAt: { type: 'string' as const, format: 'date-time' },
              updatedAt: { type: 'string' as const, format: 'date-time' },
            },
          },
          Category: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const, format: 'uuid' },
              name: { type: 'string' as const },
              slug: { type: 'string' as const },
              description: { type: 'string' as const, nullable: true },
              parentId: { type: 'string' as const, format: 'uuid', nullable: true },
              createdAt: { type: 'string' as const, format: 'date-time' },
            },
          },
          Order: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const, format: 'uuid' },
              orderNumber: { type: 'string' as const },
              status: { type: 'string' as const },
              total: { type: 'number' as const },
              customerEmail: { type: 'string' as const },
              createdAt: { type: 'string' as const, format: 'date-time' },
            },
          },
          Customer: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const, format: 'uuid' },
              email: { type: 'string' as const },
              firstName: { type: 'string' as const },
              lastName: { type: 'string' as const },
              createdAt: { type: 'string' as const, format: 'date-time' },
            },
          },
          ApiKey: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const, format: 'uuid' },
              prefix: { type: 'string' as const },
              displayKey: { type: 'string' as const },
              name: { type: 'string' as const },
              permissions: {
                type: 'array' as const,
                items: { type: 'string' as const },
              },
              lastUsedAt: { type: 'string' as const, format: 'date-time', nullable: true },
              expiresAt: { type: 'string' as const, format: 'date-time', nullable: true },
              createdAt: { type: 'string' as const, format: 'date-time' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
      paths: {
        // Auth
        '/api/v1/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login and get JWT token',
            security: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object' as const,
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string' as const },
                      password: { type: 'string' as const },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Login successful, returns JWT token' },
              '401': { description: 'Invalid credentials' },
            },
          },
        },

        // Products
        '/api/v1/products': {
          get: {
            tags: ['Products'],
            summary: 'List products',
            security: [],
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' as const } },
              { name: 'limit', in: 'query', schema: { type: 'integer' as const } },
              { name: 'status', in: 'query', schema: { type: 'string' as const } },
              { name: 'categoryId', in: 'query', schema: { type: 'string' as const } },
              { name: 'search', in: 'query', schema: { type: 'string' as const } },
            ],
            responses: {
              '200': {
                description: 'Product list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object' as const,
                      properties: {
                        data: {
                          type: 'array' as const,
                          items: { $ref: '#/components/schemas/Product' },
                        },
                        pagination: { type: 'object' as const },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ['Products'],
            summary: 'Create a product',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Product' },
                },
              },
            },
            responses: {
              '201': { description: 'Product created' },
            },
          },
        },
        '/api/v1/products/{id}': {
          get: {
            tags: ['Products'],
            summary: 'Get product by ID',
            security: [],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Product details' } },
          },
          put: {
            tags: ['Products'],
            summary: 'Update a product',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Product' },
                },
              },
            },
            responses: { '200': { description: 'Product updated' } },
          },
          delete: {
            tags: ['Products'],
            summary: 'Delete a product',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Product deleted' } },
          },
        },

        // Categories
        '/api/v1/categories': {
          get: {
            tags: ['Categories'],
            summary: 'List categories',
            security: [],
            responses: { '200': { description: 'Category list' } },
          },
          post: {
            tags: ['Categories'],
            summary: 'Create a category',
            responses: { '201': { description: 'Category created' } },
          },
        },
        '/api/v1/categories/{id}': {
          get: {
            tags: ['Categories'],
            summary: 'Get category by ID',
            security: [],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Category details' } },
          },
          put: {
            tags: ['Categories'],
            summary: 'Update a category',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Category updated' } },
          },
          delete: {
            tags: ['Categories'],
            summary: 'Delete a category',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Category deleted' } },
          },
        },

        // Orders
        '/api/v1/orders': {
          get: {
            tags: ['Orders'],
            summary: 'List orders',
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' as const } },
              { name: 'limit', in: 'query', schema: { type: 'integer' as const } },
              { name: 'status', in: 'query', schema: { type: 'string' as const } },
            ],
            responses: { '200': { description: 'Order list' } },
          },
        },
        '/api/v1/orders/{id}': {
          get: {
            tags: ['Orders'],
            summary: 'Get order by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Order details' } },
          },
          put: {
            tags: ['Orders'],
            summary: 'Update order status',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Order updated' } },
          },
        },

        // Customers
        '/api/v1/customers': {
          get: {
            tags: ['Customers'],
            summary: 'List customers',
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' as const } },
              { name: 'limit', in: 'query', schema: { type: 'integer' as const } },
              { name: 'search', in: 'query', schema: { type: 'string' as const } },
            ],
            responses: { '200': { description: 'Customer list' } },
          },
        },
        '/api/v1/customers/{id}': {
          get: {
            tags: ['Customers'],
            summary: 'Get customer by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'Customer details' } },
          },
        },

        // Coupons
        '/api/v1/coupons': {
          get: {
            tags: ['Coupons'],
            summary: 'List coupons',
            responses: { '200': { description: 'Coupon list' } },
          },
          post: {
            tags: ['Coupons'],
            summary: 'Create a coupon',
            responses: { '201': { description: 'Coupon created' } },
          },
        },

        // Shipping
        '/api/v1/shipping/methods': {
          get: {
            tags: ['Shipping'],
            summary: 'List shipping methods',
            security: [],
            responses: { '200': { description: 'Shipping methods' } },
          },
        },

        // Tax
        '/api/v1/tax/calculate': {
          post: {
            tags: ['Tax'],
            summary: 'Calculate tax for items',
            security: [],
            responses: { '200': { description: 'Tax calculation result' } },
          },
        },

        // Media
        '/api/v1/media': {
          get: {
            tags: ['Media'],
            summary: 'List media files',
            responses: { '200': { description: 'Media list' } },
          },
          post: {
            tags: ['Media'],
            summary: 'Upload media file',
            requestBody: {
              required: true,
              content: { 'multipart/form-data': { schema: { type: 'object' as const } } },
            },
            responses: { '201': { description: 'File uploaded' } },
          },
        },

        // Pages
        '/api/v1/pages': {
          get: {
            tags: ['Pages'],
            summary: 'List pages',
            security: [],
            responses: { '200': { description: 'Page list' } },
          },
          post: {
            tags: ['Pages'],
            summary: 'Create a page',
            responses: { '201': { description: 'Page created' } },
          },
        },

        // Currencies
        '/api/v1/currencies': {
          get: {
            tags: ['Currencies'],
            summary: 'List currencies',
            responses: { '200': { description: 'Currency list' } },
          },
        },

        // Users
        '/api/v1/users': {
          get: {
            tags: ['Users'],
            summary: 'List admin users (superadmin only)',
            responses: { '200': { description: 'User list' } },
          },
        },
        '/api/v1/users/me': {
          get: {
            tags: ['Users'],
            summary: 'Get current user profile',
            responses: { '200': { description: 'Current user' } },
          },
        },

        // API Keys
        '/api/v1/api-keys': {
          get: {
            tags: ['API Keys'],
            summary: 'List API keys (prefix only)',
            responses: {
              '200': {
                description: 'API key list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object' as const,
                      properties: {
                        data: {
                          type: 'array' as const,
                          items: { $ref: '#/components/schemas/ApiKey' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ['API Keys'],
            summary: 'Create a new API key (returns full key ONCE)',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object' as const,
                    required: ['name'],
                    properties: {
                      name: { type: 'string' as const },
                      permissions: {
                        type: 'array' as const,
                        items: { type: 'string' as const },
                      },
                      expiresAt: { type: 'string' as const, format: 'date-time' },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'API key created (full key in response)',
              },
            },
          },
        },
        '/api/v1/api-keys/{id}': {
          patch: {
            tags: ['API Keys'],
            summary: 'Update API key name/permissions',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'API key updated' } },
          },
          delete: {
            tags: ['API Keys'],
            summary: 'Revoke an API key',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' as const, format: 'uuid' },
              },
            ],
            responses: { '200': { description: 'API key revoked' } },
          },
        },

        // Search
        '/api/v1/search': {
          get: {
            tags: ['Search'],
            summary: 'Search products',
            security: [],
            parameters: [
              {
                name: 'q',
                in: 'query',
                required: true,
                schema: { type: 'string' as const },
              },
            ],
            responses: { '200': { description: 'Search results' } },
          },
        },

        // Plugins
        '/api/v1/plugins': {
          get: {
            tags: ['Plugins'],
            summary: 'List installed plugins',
            responses: { '200': { description: 'Plugin list' } },
          },
        },

        // Emails
        '/api/v1/emails': {
          get: {
            tags: ['Emails'],
            summary: 'List email logs',
            responses: { '200': { description: 'Email log list' } },
          },
        },

        // System
        '/api/v1/system/info': {
          get: {
            tags: ['System'],
            summary: 'System information',
            responses: { '200': { description: 'System info' } },
          },
        },

        // Health
        '/health': {
          get: {
            tags: ['System'],
            summary: 'Health check',
            security: [],
            responses: {
              '200': {
                description: 'Service healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object' as const,
                      properties: {
                        status: { type: 'string' as const },
                        version: { type: 'string' as const },
                        timestamp: { type: 'string' as const, format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // OpenAPI
        '/api/v1/openapi.json': {
          get: {
            tags: ['System'],
            summary: 'OpenAPI 3.0 specification',
            security: [],
            responses: {
              '200': { description: 'OpenAPI spec JSON' },
            },
          },
        },
      },
    };

    return c.json(spec);
  });

  return router;
}
