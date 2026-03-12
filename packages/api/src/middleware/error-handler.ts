import type { ErrorHandler } from 'hono';
import { AppError } from '@forkcart/shared';
import { createLogger } from '@forkcart/core';
import { ZodError } from 'zod';

const logger = createLogger('error-handler');

/** Global error handler — converts errors into structured JSON responses */
export const errorHandler: ErrorHandler = (error, c) => {
  // Application errors (our own)
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ error: error.message, code: error.code }, 'Server error');
    }
    return c.json(error.toJSON(), error.statusCode as 400);
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        },
      },
      400,
    );
  }

  // Unexpected errors
  logger.error({ error: error.message, stack: error.stack }, 'Unexpected error');

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env['NODE_ENV'] === 'production' ? 'An unexpected error occurred' : error.message,
      },
    },
    500,
  );
};
