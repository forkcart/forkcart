import type { Context, Next } from 'hono';
import type { CustomerAuthService, CustomerJwtPayload } from '@forkcart/core';

/** Extend Hono context with customer data */
declare module 'hono' {
  interface ContextVariableMap {
    customer: { id: string; email: string };
    customerToken: string;
  }
}

/** Create middleware that requires customer authentication */
export function createCustomerAuthMiddleware(customerAuthService: CustomerAuthService) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        401,
      );
    }

    const token = authHeader.slice(7);

    try {
      const payload: CustomerJwtPayload = customerAuthService.verifyToken(token);
      c.set('customer', { id: payload.sub, email: payload.email });
      c.set('customerToken', token);
      return next();
    } catch {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
  };
}
