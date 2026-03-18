import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { ConflictError, ValidationError, UnauthorizedError, NotFoundError } from '@forkcart/shared';
import type { CustomerRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { CUSTOMER_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('customer-auth');

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 72;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  type: 'customer';
  iat: number;
  exp: number;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: Date;
}

export interface CustomerLoginResult {
  customer: CustomerProfile;
  token: string;
  expiresAt: Date;
}

export interface CustomerAuthServiceDeps {
  customerRepository: CustomerRepository;
  eventBus: EventBus;
  jwtSecret: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CustomerAuthService {
  private readonly repo: CustomerRepository;
  private readonly events: EventBus;
  private readonly jwtSecret: string;

  constructor(deps: CustomerAuthServiceDeps) {
    this.repo = deps.customerRepository;
    this.events = deps.eventBus;
    this.jwtSecret = deps.jwtSecret;

    if (!deps.jwtSecret || deps.jwtSecret.length < 32) {
      throw new Error('Customer JWT secret must be at least 32 characters');
    }
  }

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<CustomerLoginResult> {
    // Validate email format
    if (!EMAIL_REGEX.test(input.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password length
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    // Check for duplicate email
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`An account with email "${input.email}" already exists`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create customer
    const customer = await this.repo.create({
      email: input.email.toLowerCase().trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      acceptsMarketing: false,
      passwordHash,
    });

    logger.info({ customerId: customer.id, email: customer.email }, 'Customer registered');
    await this.events.emit(CUSTOMER_EVENTS.REGISTERED, { customer });

    // Auto-login after registration
    const { token, expiresAt } = this.signToken(customer.id, customer.email);

    return {
      customer: this.toProfile(customer),
      token,
      expiresAt,
    };
  }

  async login(email: string, password: string): Promise<CustomerLoginResult> {
    const customer = await this.repo.findByEmail(email.toLowerCase().trim());
    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info({ customerId: customer.id }, 'Customer logged in');
    await this.events.emit(CUSTOMER_EVENTS.LOGIN, { customerId: customer.id });

    const { token, expiresAt } = this.signToken(customer.id, customer.email);

    return {
      customer: this.toProfile(customer),
      token,
      expiresAt,
    };
  }

  async getProfile(customerId: string): Promise<CustomerProfile> {
    const customer = await this.repo.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }
    return this.toProfile(customer);
  }

  async updateProfile(
    customerId: string,
    input: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ): Promise<CustomerProfile> {
    // Validate email if changing
    if (input.email) {
      if (!EMAIL_REGEX.test(input.email)) {
        throw new ValidationError('Invalid email format');
      }
      const existing = await this.repo.findByEmail(input.email.toLowerCase().trim());
      if (existing && existing.id !== customerId) {
        throw new ConflictError(`An account with email "${input.email}" already exists`);
      }
    }

    const updateData: Record<string, string> = {};
    if (input.firstName) updateData['firstName'] = input.firstName.trim();
    if (input.lastName) updateData['lastName'] = input.lastName.trim();
    if (input.email) updateData['email'] = input.email.toLowerCase().trim();
    if (input.phone !== undefined) updateData['phone'] = input.phone;

    const customer = await this.repo.update(customerId, updateData);
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    logger.info({ customerId }, 'Customer profile updated');
    return this.toProfile(customer);
  }

  async changePassword(
    customerId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const customer = await this.repo.findByEmail_raw(customerId);
    if (!customer || !customer.passwordHash) {
      throw new NotFoundError('Customer', customerId);
    }

    const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(customerId, passwordHash);

    logger.info({ customerId }, 'Customer password changed');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const customer = await this.repo.findByEmail(email.toLowerCase().trim());
    if (!customer) {
      // Don't reveal if email exists — return same message regardless
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.repo.setResetToken(customer.id, resetToken, resetExpires);

    // TODO: Send reset token via email instead of returning it
    // Example: await emailService.sendPasswordResetEmail(customer.email, resetToken);

    logger.info({ customerId: customer.id }, 'Password reset token generated');

    return { message: 'If the email exists, a reset link has been sent' };
  }

  verifyToken(token: string): CustomerJwtPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as CustomerJwtPayload;
      if (payload.type !== 'customer') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private signToken(customerId: string, email: string): { token: string; expiresAt: Date } {
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const token = jwt.sign(
      {
        sub: customerId,
        email,
        type: 'customer',
      } satisfies Omit<CustomerJwtPayload, 'iat' | 'exp'>,
      this.jwtSecret,
      { expiresIn: `${TOKEN_EXPIRY_HOURS}h` },
    );

    return { token, expiresAt };
  }

  private toProfile(customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    acceptsMarketing: boolean;
    orderCount: number;
    totalSpent: number;
    createdAt: Date;
  }): CustomerProfile {
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      acceptsMarketing: customer.acceptsMarketing,
      orderCount: customer.orderCount,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt,
    };
  }
}

export class CustomerAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CustomerAuthError';
  }
}
