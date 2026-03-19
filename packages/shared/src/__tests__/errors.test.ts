import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from '../index';

describe('AppError', () => {
  it('has correct properties', () => {
    const err = new AppError('fail', 500, 'INTERNAL');
    expect(err.message).toBe('fail');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL');
    expect(err).toBeInstanceOf(Error);
  });

  it('serializes to JSON', () => {
    const err = new AppError('fail', 400, 'BAD', { field: 'name' });
    const json = err.toJSON();
    expect(json.error.code).toBe('BAD');
    expect(json.error.message).toBe('fail');
    expect(json.error.details).toEqual({ field: 'name' });
  });

  it('omits details when not provided', () => {
    const err = new AppError('fail', 400, 'BAD');
    const json = err.toJSON();
    expect(json.error.details).toBeUndefined();
  });
});

describe('NotFoundError', () => {
  it('creates with resource and identifier', () => {
    const err = new NotFoundError('Product', 'abc-123');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('Product');
    expect(err.message).toContain('abc-123');
  });

  it('creates with resource only', () => {
    const err = new NotFoundError('Product');
    expect(err.message).toContain('Product');
    expect(err.message).toContain('not found');
  });
});

describe('ValidationError', () => {
  it('has status 400', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});

describe('ConflictError', () => {
  it('has status 409', () => {
    const err = new ConflictError('already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('UnauthorizedError', () => {
  it('has status 401 with default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });
});

describe('ForbiddenError', () => {
  it('has status 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });
});

describe('RateLimitError', () => {
  it('has status 429', () => {
    const err = new RateLimitError(60);
    expect(err.statusCode).toBe(429);
    expect(err.details).toEqual({ retryAfter: 60 });
  });
});
