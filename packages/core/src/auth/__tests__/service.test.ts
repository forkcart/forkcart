import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { AuthService, AuthError } from '../service';
import type { UserRepository } from '../repository';

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'a-very-secret-key-that-is-at-least-32-characters-long';

function mockUserRepo(): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
    delete: vi.fn(),
    countByRole: vi.fn(),
    updateLastLogin: vi.fn(),
    createSession: vi.fn(),
    findSessionByToken: vi.fn(),
    deleteSession: vi.fn(),
    deleteExpiredSessions: vi.fn(),
  } as unknown as UserRepository;
}

const NOW = new Date('2026-03-19T12:00:00Z');

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'admin@forkcart.com',
    passwordHash: '', // will be set per test
    firstName: 'Admin',
    lastName: 'User',
    role: 'superadmin',
    isActive: true,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let repo: ReturnType<typeof mockUserRepo>;
  let service: AuthService;

  beforeEach(() => {
    repo = mockUserRepo();
    service = new AuthService(repo, JWT_SECRET);
  });

  // ── Constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws when JWT secret is too short', () => {
      expect(() => new AuthService(repo, 'short')).toThrow(
        'SESSION_SECRET must be at least 32 characters',
      );
    });

    it('throws when JWT secret is empty', () => {
      expect(() => new AuthService(repo, '')).toThrow(
        'SESSION_SECRET must be at least 32 characters',
      );
    });

    it('creates service with valid secret', () => {
      expect(new AuthService(repo, JWT_SECRET)).toBeInstanceOf(AuthService);
    });
  });

  // ── hashPassword ────────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await AuthService.hashPassword('testpassword');
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it('produces different hashes for same input (salt)', async () => {
      const a = await AuthService.hashPassword('testpassword');
      const b = await AuthService.hashPassword('testpassword');
      expect(a).not.toBe(b);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('succeeds with correct bcrypt credentials', async () => {
      const hash = await AuthService.hashPassword('correct-password');
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeUser({ passwordHash: hash }) as never);
      vi.mocked(repo.createSession).mockResolvedValue({} as never);
      vi.mocked(repo.updateLastLogin).mockResolvedValue(undefined as never);

      const result = await service.login('admin@forkcart.com', 'correct-password');

      expect(result.user.email).toBe('admin@forkcart.com');
      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(repo.createSession).toHaveBeenCalledOnce();
      expect(repo.updateLastLogin).toHaveBeenCalledWith('user-1');
    });

    it('succeeds with legacy sha256 hash and migrates to bcrypt', async () => {
      const legacyHash = crypto.createHash('sha256').update('legacy-pw').digest('hex');
      vi.mocked(repo.findByEmail).mockResolvedValue(
        fakeUser({ passwordHash: legacyHash }) as never,
      );
      vi.mocked(repo.createSession).mockResolvedValue({} as never);
      vi.mocked(repo.updateLastLogin).mockResolvedValue(undefined as never);
      vi.mocked(repo.updatePassword).mockResolvedValue(undefined as never);

      const result = await service.login('admin@forkcart.com', 'legacy-pw');

      expect(result.user.email).toBe('admin@forkcart.com');
      // Should migrate hash
      expect(repo.updatePassword).toHaveBeenCalledOnce();
      const [, newHash] = vi.mocked(repo.updatePassword).mock.calls[0]!;
      expect(newHash).toMatch(/^\$2[aby]?\$/); // bcrypt
    });

    it('throws INVALID_CREDENTIALS for non-existent user', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(undefined as never);

      await expect(service.login('nobody@example.com', 'pw')).rejects.toThrow(AuthError);
      await expect(service.login('nobody@example.com', 'pw')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('throws INVALID_CREDENTIALS for wrong password', async () => {
      const hash = await AuthService.hashPassword('correct');
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeUser({ passwordHash: hash }) as never);

      await expect(service.login('admin@forkcart.com', 'wrong')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('throws ACCOUNT_DISABLED for inactive user', async () => {
      const hash = await AuthService.hashPassword('pw');
      vi.mocked(repo.findByEmail).mockResolvedValue(
        fakeUser({ passwordHash: hash, isActive: false }) as never,
      );

      await expect(service.login('admin@forkcart.com', 'pw')).rejects.toMatchObject({
        code: 'ACCOUNT_DISABLED',
      });
    });

    it('passes IP and user agent to session creation', async () => {
      const hash = await AuthService.hashPassword('pw');
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeUser({ passwordHash: hash }) as never);
      vi.mocked(repo.createSession).mockResolvedValue({} as never);
      vi.mocked(repo.updateLastLogin).mockResolvedValue(undefined as never);

      await service.login('admin@forkcart.com', 'pw', {
        ipAddress: '1.2.3.4',
        userAgent: 'TestAgent',
      });

      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '1.2.3.4', userAgent: 'TestAgent' }),
      );
    });
  });

  // ── verifyToken ─────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns user for valid token with active session', async () => {
      // Create a real token
      const sessionToken = 'session-abc';
      const token = jwt.sign(
        { sub: 'user-1', email: 'admin@forkcart.com', role: 'superadmin', sessionToken },
        JWT_SECRET,
        { expiresIn: '24h' },
      );

      vi.mocked(repo.findSessionByToken).mockResolvedValue({ token: sessionToken } as never);
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);

      const user = await service.verifyToken(token);
      expect(user.id).toBe('user-1');
      expect(user.role).toBe('superadmin');
    });

    it('throws INVALID_TOKEN for garbage token', async () => {
      await expect(service.verifyToken('not-a-jwt')).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
      });
    });

    it('throws INVALID_TOKEN for expired token', async () => {
      const token = jwt.sign(
        {
          sub: 'user-1',
          email: 'a@b.com',
          role: 'admin',
          sessionToken: 'x',
        },
        JWT_SECRET,
        { expiresIn: '0s' },
      );
      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 50));

      await expect(service.verifyToken(token)).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
      });
    });

    it('throws SESSION_REVOKED when session not found in DB', async () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.com', role: 'admin', sessionToken: 'gone' },
        JWT_SECRET,
        { expiresIn: '24h' },
      );

      vi.mocked(repo.findSessionByToken).mockResolvedValue(undefined as never);

      await expect(service.verifyToken(token)).rejects.toMatchObject({
        code: 'SESSION_REVOKED',
      });
    });

    it('throws USER_INVALID when user is disabled', async () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.com', role: 'admin', sessionToken: 's1' },
        JWT_SECRET,
        { expiresIn: '24h' },
      );

      vi.mocked(repo.findSessionByToken).mockResolvedValue({ token: 's1' } as never);
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ isActive: false }) as never);

      await expect(service.verifyToken(token)).rejects.toMatchObject({
        code: 'USER_INVALID',
      });
    });

    it('throws USER_INVALID when user not found', async () => {
      const token = jwt.sign(
        { sub: 'deleted-user', email: 'a@b.com', role: 'admin', sessionToken: 's1' },
        JWT_SECRET,
        { expiresIn: '24h' },
      );

      vi.mocked(repo.findSessionByToken).mockResolvedValue({ token: 's1' } as never);
      vi.mocked(repo.findById).mockResolvedValue(undefined as never);

      await expect(service.verifyToken(token)).rejects.toMatchObject({
        code: 'USER_INVALID',
      });
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes session from DB', async () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.com', role: 'admin', sessionToken: 'sess-1' },
        JWT_SECRET,
        { expiresIn: '24h' },
      );

      vi.mocked(repo.deleteSession).mockResolvedValue(undefined as never);

      await service.logout(token);
      expect(repo.deleteSession).toHaveBeenCalledWith('sess-1');
    });

    it('does nothing for invalid/expired token', async () => {
      await service.logout('garbage-token');
      expect(repo.deleteSession).not.toHaveBeenCalled();
    });
  });

  // ── createUser ──────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('creates user with hashed password', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(undefined as never);
      vi.mocked(repo.create).mockImplementation(async (input) => ({
        id: 'new-1',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: true,
        lastLoginAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }));

      const result = await service.createUser({
        email: 'new@test.com',
        password: 'securepassword',
        firstName: 'New',
        lastName: 'User',
        role: 'admin',
      });

      expect(result.email).toBe('new@test.com');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          passwordHash: expect.stringMatching(/^\$2[aby]?\$/) as string,
        }),
      );
    });

    it('rejects invalid role', async () => {
      await expect(
        service.createUser({
          email: 'a@b.com',
          password: 'longpassword',
          firstName: 'A',
          lastName: 'B',
          role: 'hacker',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_ROLE' });
    });

    it('rejects password shorter than 8 characters', async () => {
      await expect(
        service.createUser({
          email: 'a@b.com',
          password: 'short',
          firstName: 'A',
          lastName: 'B',
          role: 'admin',
        }),
      ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
    });

    it('rejects duplicate email', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeUser() as never);

      await expect(
        service.createUser({
          email: 'admin@forkcart.com',
          password: 'longpassword',
          firstName: 'A',
          lastName: 'B',
          role: 'admin',
        }),
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
    });
  });

  // ── updateUser ──────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates user fields', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);
      vi.mocked(repo.update).mockResolvedValue({
        ...fakeUser(),
        firstName: 'Updated',
      } as never);

      const result = await service.updateUser('user-1', { firstName: 'Updated' }, 'other-user');
      expect(result.firstName).toBe('Updated');
    });

    it('prevents self-deactivation', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);

      await expect(
        service.updateUser('user-1', { isActive: false }, 'user-1'),
      ).rejects.toMatchObject({ code: 'SELF_DEACTIVATE' });
    });

    it('prevents self-role-change', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);

      await expect(
        service.updateUser('user-1', { role: 'editor' }, 'user-1'),
      ).rejects.toMatchObject({ code: 'SELF_ROLE_CHANGE' });
    });

    it('prevents removing last superadmin role', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ role: 'superadmin' }) as never);
      vi.mocked(repo.countByRole).mockResolvedValue(0 as never);

      await expect(
        service.updateUser('user-1', { role: 'editor' }, 'other-user'),
      ).rejects.toMatchObject({ code: 'LAST_SUPERADMIN' });
    });

    it('rejects duplicate email on update', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);
      vi.mocked(repo.findByEmail).mockResolvedValue(fakeUser({ id: 'other-user' }) as never);

      await expect(
        service.updateUser('user-1', { email: 'taken@test.com' }, 'other-user'),
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────

  describe('changePasswordWithVerification', () => {
    it('changes password when current password is correct', async () => {
      const hash = await AuthService.hashPassword('current-pw');
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ passwordHash: hash }) as never);
      vi.mocked(repo.updatePassword).mockResolvedValue(undefined as never);

      await service.changePasswordWithVerification('user-1', 'current-pw', 'new-password-ok');
      expect(repo.updatePassword).toHaveBeenCalledWith(
        'user-1',
        expect.stringMatching(/^\$2[aby]?\$/) as string,
      );
    });

    it('rejects wrong current password', async () => {
      const hash = await AuthService.hashPassword('real-pw');
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ passwordHash: hash }) as never);

      await expect(
        service.changePasswordWithVerification('user-1', 'wrong-pw', 'new-password-ok'),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
    });

    it('rejects new password shorter than 8 chars', async () => {
      await expect(
        service.changePasswordWithVerification('user-1', 'whatever', 'short'),
      ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
    });
  });

  describe('changePassword (superadmin reset)', () => {
    it('changes password without current password', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser() as never);
      vi.mocked(repo.updatePassword).mockResolvedValue(undefined as never);

      await service.changePassword('user-1', 'new-secure-pw');
      expect(repo.updatePassword).toHaveBeenCalledOnce();
    });

    it('rejects short password', async () => {
      await expect(service.changePassword('user-1', 'abc')).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
      });
    });

    it('throws for non-existent user', async () => {
      vi.mocked(repo.findById).mockResolvedValue(undefined as never);

      await expect(service.changePassword('ghost', 'longpassword')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
    });
  });

  // ── deleteUser ──────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deletes a non-superadmin user', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ role: 'editor' }) as never);
      vi.mocked(repo.delete).mockResolvedValue(true as never);

      await service.deleteUser('user-1', 'other-user');
      expect(repo.delete).toHaveBeenCalledWith('user-1');
    });

    it('prevents self-deletion', async () => {
      await expect(service.deleteUser('user-1', 'user-1')).rejects.toMatchObject({
        code: 'SELF_DELETE',
      });
    });

    it('prevents deleting last superadmin', async () => {
      vi.mocked(repo.findById).mockResolvedValue(fakeUser({ role: 'superadmin' }) as never);
      vi.mocked(repo.countByRole).mockResolvedValue(0 as never);

      await expect(service.deleteUser('user-1', 'other-user')).rejects.toMatchObject({
        code: 'LAST_SUPERADMIN',
      });
    });

    it('throws for non-existent user', async () => {
      vi.mocked(repo.findById).mockResolvedValue(undefined as never);

      await expect(service.deleteUser('ghost', 'other-user')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty email on login', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(undefined as never);
      await expect(service.login('', 'password')).rejects.toThrow(AuthError);
    });

    it('handles empty password on login', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(undefined as never);
      await expect(service.login('a@b.com', '')).rejects.toThrow(AuthError);
    });
  });
});
