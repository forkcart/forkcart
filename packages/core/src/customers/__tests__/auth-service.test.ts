import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { CustomerAuthService } from '../auth-service';
import type { CustomerRepository } from '../repository';
import type { EventBus } from '../../plugins/event-bus';
import type { EmailService } from '../../email/service';
import { ConflictError, ValidationError, UnauthorizedError, NotFoundError } from '@forkcart/shared';

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'customer-jwt-secret-that-is-at-least-32-chars-long!!';

const NOW = new Date('2026-03-19T12:00:00Z');

function fakeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    email: 'customer@shop.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    acceptsMarketing: false,
    orderCount: 0,
    totalSpent: 0,
    passwordHash: '', // set per test
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function mockRepo(): CustomerRepository {
  return {
    findById: vi.fn(),
    findByIdWithOrders: vi.fn(),
    findByEmail: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findByEmail_raw: vi.fn(),
    updatePasswordHash: vi.fn(),
    setResetToken: vi.fn(),
    findByResetToken: vi.fn(),
    clearResetToken: vi.fn(),
    incrementOrderStats: vi.fn(),
    findAddressesByCustomerId: vi.fn(),
    findAddressById: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    clearDefaultAddresses: vi.fn(),
    createAddress: vi.fn(),
  } as unknown as CustomerRepository;
}

function mockEventBus(): EventBus {
  return { emit: vi.fn().mockResolvedValue(undefined) } as unknown as EventBus;
}

function mockEmailService(): EmailService {
  return { sendPasswordReset: vi.fn().mockResolvedValue(undefined) } as unknown as EmailService;
}

function createService(overrides?: {
  repo?: CustomerRepository;
  events?: EventBus;
  emailService?: EmailService;
}) {
  const repo = overrides?.repo ?? mockRepo();
  const events = overrides?.events ?? mockEventBus();
  return {
    service: new CustomerAuthService({
      customerRepository: repo,
      eventBus: events,
      jwtSecret: JWT_SECRET,
      emailService: overrides?.emailService,
      storefrontUrl: 'https://shop.test',
    }),
    repo,
    events,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CustomerAuthService', () => {
  // ── Constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws when JWT secret is too short', () => {
      expect(
        () =>
          new CustomerAuthService({
            customerRepository: mockRepo(),
            eventBus: mockEventBus(),
            jwtSecret: 'short',
          }),
      ).toThrow('Customer JWT secret must be at least 32 characters');
    });

    it('creates service with valid config', () => {
      const { service } = createService();
      expect(service).toBeInstanceOf(CustomerAuthService);
    });
  });

  // ── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('registers a new customer and returns token', async () => {
      const { service, repo, events } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      vi.mocked(repo.create).mockResolvedValue(fakeCustomer() as never);

      const result = await service.register({
        email: 'new@shop.com',
        password: 'secure-pw-123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.customer.email).toBe('customer@shop.com');
      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(events.emit).toHaveBeenCalledWith('customer.registered', expect.anything());
    });

    it('lowercases and trims email and names', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      vi.mocked(repo.create).mockResolvedValue(fakeCustomer() as never);

      await service.register({
        email: 'UPPER@SHOP.COM',
        password: 'secure-pw-123',
        firstName: ' Jane ',
        lastName: ' Doe ',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'upper@shop.com',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      );
    });

    it('rejects invalid email format', async () => {
      const { service } = createService();

      await expect(
        service.register({
          email: 'not-an-email',
          password: 'securepassword',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects password shorter than 8 characters', async () => {
      const { service } = createService();

      await expect(
        service.register({
          email: 'a@b.com',
          password: 'short',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects duplicate email', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer() as never);

      await expect(
        service.register({
          email: 'customer@shop.com',
          password: 'longpassword',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const { service, repo } = createService();
      // bcryptjs is actually imported by the service, we need a real hash
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('my-password', 4); // low rounds for speed

      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer({ passwordHash: hash }) as never);

      const result = await service.login('customer@shop.com', 'my-password');

      expect(result.customer.id).toBe('cust-1');
      expect(result.token).toBeTruthy();
    });

    it('throws UnauthorizedError for non-existent customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);

      await expect(service.login('nobody@shop.com', 'pw')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for wrong password', async () => {
      const { service, repo } = createService();
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('correct', 4);
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer({ passwordHash: hash }) as never);

      await expect(service.login('customer@shop.com', 'wrong')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for customer without password', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer({ passwordHash: null }) as never);

      await expect(service.login('customer@shop.com', 'pw')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ── verifyToken ─────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns payload for valid token', () => {
      const { service } = createService();
      const token = jwt.sign({ sub: 'cust-1', email: 'a@b.com', type: 'customer' }, JWT_SECRET, {
        expiresIn: '72h',
      });

      const payload = service.verifyToken(token);
      expect(payload.sub).toBe('cust-1');
      expect(payload.type).toBe('customer');
    });

    it('throws for invalid token', () => {
      const { service } = createService();
      expect(() => service.verifyToken('garbage')).toThrow(UnauthorizedError);
    });

    it('throws for token with wrong type', () => {
      const { service } = createService();
      const token = jwt.sign({ sub: 'u1', email: 'a@b.com', type: 'admin' }, JWT_SECRET, {
        expiresIn: '1h',
      });

      expect(() => service.verifyToken(token)).toThrow(UnauthorizedError);
    });

    it('throws for token signed with different secret', () => {
      const { service } = createService();
      const token = jwt.sign(
        { sub: 'cust-1', email: 'a@b.com', type: 'customer' },
        'different-secret-that-is-definitely-long-enough',
        { expiresIn: '1h' },
      );

      expect(() => service.verifyToken(token)).toThrow(UnauthorizedError);
    });

    it('rejects token issued before logout', async () => {
      const { service } = createService();

      // Sign a token with iat = now
      const token = jwt.sign({ sub: 'cust-1', email: 'a@b.com', type: 'customer' }, JWT_SECRET, {
        expiresIn: '72h',
      });

      // Wait a tiny bit so logout timestamp > iat
      await new Promise((r) => setTimeout(r, 1100));
      await service.logout('cust-1');

      expect(() => service.verifyToken(token)).toThrow(UnauthorizedError);
    });
  });

  // ── forgotPassword + resetPassword ──────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns generic message even for non-existent email', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);

      const result = await service.forgotPassword('ghost@shop.com');
      expect(result.message).toMatch(/reset link/i);
    });

    it('generates reset token for existing customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer() as never);
      vi.mocked(repo.setResetToken).mockResolvedValue(undefined as never);

      await service.forgotPassword('customer@shop.com');

      expect(repo.setResetToken).toHaveBeenCalledWith(
        'cust-1',
        expect.any(String) as string,
        expect.any(Date) as Date,
      );
    });

    it('sends email when emailService is configured', async () => {
      const emailService = mockEmailService();
      const { service, repo } = createService({ emailService });
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer() as never);
      vi.mocked(repo.setResetToken).mockResolvedValue(undefined as never);

      await service.forgotPassword('customer@shop.com');

      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        'customer@shop.com',
        expect.objectContaining({ customerName: 'Jane Doe' }),
      );
    });
  });

  describe('resetPassword', () => {
    it('resets password with valid token', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByResetToken).mockResolvedValue(fakeCustomer() as never);
      vi.mocked(repo.updatePasswordHash).mockResolvedValue(undefined as never);
      vi.mocked(repo.clearResetToken).mockResolvedValue(undefined as never);

      await service.resetPassword('valid-token', 'new-secure-pw');

      expect(repo.updatePasswordHash).toHaveBeenCalledWith(
        'cust-1',
        expect.stringMatching(/^\$2[aby]?\$/) as string,
      );
      expect(repo.clearResetToken).toHaveBeenCalledWith('cust-1');
    });

    it('throws UnauthorizedError for invalid/expired token', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByResetToken).mockResolvedValue(null as never);

      await expect(service.resetPassword('bad-token', 'new-secure-pw')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('rejects short new password', async () => {
      const { service } = createService();

      await expect(service.resetPassword('token', 'short')).rejects.toThrow(ValidationError);
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('changes password with correct current password', async () => {
      const { service, repo } = createService();
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('current-pw', 4);

      vi.mocked(repo.findByEmail_raw).mockResolvedValue(
        fakeCustomer({ passwordHash: hash }) as never,
      );
      vi.mocked(repo.updatePasswordHash).mockResolvedValue(undefined as never);

      await service.changePassword('cust-1', 'current-pw', 'brand-new-pw');
      expect(repo.updatePasswordHash).toHaveBeenCalledOnce();
    });

    it('throws for wrong current password', async () => {
      const { service, repo } = createService();
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('real-pw', 4);

      vi.mocked(repo.findByEmail_raw).mockResolvedValue(
        fakeCustomer({ passwordHash: hash }) as never,
      );

      await expect(service.changePassword('cust-1', 'wrong-pw', 'brand-new-pw')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('rejects short new password', async () => {
      const { service } = createService();

      await expect(service.changePassword('cust-1', 'current', 'abc')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns customer profile', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findById).mockResolvedValue(fakeCustomer() as never);

      const profile = await service.getProfile('cust-1');
      expect(profile.email).toBe('customer@shop.com');
      expect(profile.firstName).toBe('Jane');
    });

    it('throws NotFoundError for missing customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findById).mockResolvedValue(null as never);

      await expect(service.getProfile('ghost')).rejects.toThrow(NotFoundError);
    });
  });

  // ── updateProfile ───────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates profile fields', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      vi.mocked(repo.update).mockResolvedValue(fakeCustomer({ firstName: 'Updated' }) as never);

      const profile = await service.updateProfile('cust-1', { firstName: 'Updated' });
      expect(profile.firstName).toBe('Updated');
    });

    it('rejects invalid email format', async () => {
      const { service } = createService();

      await expect(service.updateProfile('cust-1', { email: 'not-valid' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects email already taken by another customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer({ id: 'other-cust' }) as never);

      await expect(service.updateProfile('cust-1', { email: 'taken@shop.com' })).rejects.toThrow(
        ConflictError,
      );
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('invalidates tokens for the customer', async () => {
      const { service } = createService();

      // Should not throw
      await service.logout('cust-1');

      // New tokens should still work, old ones shouldn't (tested in verifyToken)
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('register rejects email with whitespace (validation before trim)', async () => {
      const { service } = createService();

      // The regex validation happens BEFORE trim, so leading/trailing spaces fail
      await expect(
        service.register({
          email: '  USER@SHOP.COM  ',
          password: 'secure-pw-123',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('register lowercases email without spaces', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      vi.mocked(repo.create).mockResolvedValue(fakeCustomer() as never);

      await service.register({
        email: 'USER@SHOP.COM',
        password: 'secure-pw-123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      // Email should be lowercased (validated OK, no spaces)
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'user@shop.com' }));
    });

    it('login lowercases email before lookup', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);

      await expect(service.login('CUSTOMER@SHOP.COM', 'pw')).rejects.toThrow(UnauthorizedError);

      expect(repo.findByEmail).toHaveBeenCalledWith('customer@shop.com');
    });

    it('updateProfile allows same email for same customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeCustomer({ id: 'cust-1' }) as never);
      vi.mocked(repo.update).mockResolvedValue(
        fakeCustomer({ email: 'customer@shop.com' }) as never,
      );

      // Should NOT throw because the found email belongs to the same customer
      const profile = await service.updateProfile('cust-1', { email: 'customer@shop.com' });
      expect(profile.email).toBe('customer@shop.com');
    });

    it('changePassword throws NotFoundError for missing customer', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail_raw).mockResolvedValue(null as never);

      await expect(service.changePassword('ghost', 'current', 'new-pw-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('forgotPassword normalizes email', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);

      await service.forgotPassword('  USER@SHOP.COM  ');

      expect(repo.findByEmail).toHaveBeenCalledWith('user@shop.com');
    });

    it('register returns token and expiry date', async () => {
      const { service, repo } = createService();
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      vi.mocked(repo.create).mockResolvedValue(fakeCustomer() as never);

      const result = await service.register({
        email: 'new@shop.com',
        password: 'secure-pw-123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      // Token should expire in the future
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('verifyToken succeeds for newly signed token after logout', async () => {
      const { service } = createService();

      // Logout first
      await service.logout('cust-1');

      // Wait a bit so the new token's iat > invalidatedAt
      await new Promise((r) => setTimeout(r, 1100));

      // Sign a NEW token (iat > invalidatedAt) — should work
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        { sub: 'cust-1', email: 'a@b.com', type: 'customer' },
        JWT_SECRET,
        { expiresIn: '72h' },
      );

      const payload = service.verifyToken(token);
      expect(payload.sub).toBe('cust-1');
    });
  });
});
