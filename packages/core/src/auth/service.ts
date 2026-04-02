import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import type { UserRepository, SafeUserRecord } from './repository';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LoginResult {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionToken: string;
  iat: number;
  exp: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

const TOKEN_EXPIRY_HOURS = 24;
const BCRYPT_ROUNDS = 12;
const VALID_ROLES = ['superadmin', 'admin', 'editor'] as const;

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters');
    }
  }

  /** Hash a plaintext password with bcrypt */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a password against a bcrypt hash.
   *
   * Note: Legacy SHA-256 support was removed in v0.1.0 (RVS-031).
   * All passwords MUST be bcrypt hashes ($2a$, $2b$, etc.).
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // RVS-031: Reject non-bcrypt hashes — no legacy SHA-256 support
    if (!hash.startsWith('$2')) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  /** Authenticate user and return JWT + session */
  async login(
    email: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED');
    }

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const sessionToken = randomBytes(32).toString('hex');

    // Create DB session
    await this.userRepository.createSession({
      userId: user.id,
      token: sessionToken,
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Sign JWT
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionToken,
      } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
      this.jwtSecret,
      { expiresIn: `${TOKEN_EXPIRY_HOURS}h` },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      expiresAt,
    };
  }

  /** Verify JWT and return the authenticated user */
  async verifyToken(token: string): Promise<AuthUser> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch {
      throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }

    // Verify session still exists in DB (allows logout/revocation)
    const session = await this.userRepository.findSessionByToken(payload.sessionToken);
    if (!session) {
      throw new AuthError('Session has been revoked', 'SESSION_REVOKED');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthError('User not found or disabled', 'USER_INVALID');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  /** Logout: delete the session from DB */
  async logout(token: string): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch {
      // Token invalid/expired — nothing to revoke
      return;
    }
    await this.userRepository.deleteSession(payload.sessionToken);
  }

  // ─── User Management ────────────────────────────────────────────────────────

  /** List all users (without password hashes) */
  async listUsers(): Promise<SafeUserRecord[]> {
    return this.userRepository.findAll();
  }

  /** Get a single user by ID (without password hash) */
  async getUser(id: string): Promise<SafeUserRecord | undefined> {
    const user = await this.userRepository.findById(id);
    if (!user) return undefined;
    // Strip password hash
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  /** Create a new user with hashed password */
  async createUser(input: CreateUserInput): Promise<SafeUserRecord> {
    // Validate role
    if (!VALID_ROLES.includes(input.role as (typeof VALID_ROLES)[number])) {
      throw new AuthError(`Invalid role: ${input.role}`, 'INVALID_ROLE');
    }

    // Validate password length
    if (input.password.length < 8) {
      throw new AuthError('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // Check email uniqueness
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new AuthError('Email already in use', 'EMAIL_EXISTS');
    }

    const passwordHash = await AuthService.hashPassword(input.password);

    return this.userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isActive: input.isActive ?? true,
    });
  }

  /** Update user fields (no password change here) */
  async updateUser(
    id: string,
    input: UpdateUserInput,
    requesterId: string,
  ): Promise<SafeUserRecord> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    // Validate role if changing
    if (input.role !== undefined) {
      if (!VALID_ROLES.includes(input.role as (typeof VALID_ROLES)[number])) {
        throw new AuthError(`Invalid role: ${input.role}`, 'INVALID_ROLE');
      }

      // Prevent removing the last superadmin
      if (user.role === 'superadmin' && input.role !== 'superadmin') {
        const superadminCount = await this.userRepository.countByRole('superadmin', id);
        if (superadminCount === 0) {
          throw new AuthError('Cannot remove the last superadmin role', 'LAST_SUPERADMIN');
        }
      }
    }

    // Prevent self-deactivation
    if (id === requesterId && input.isActive === false) {
      throw new AuthError('Cannot deactivate your own account', 'SELF_DEACTIVATE');
    }

    // Prevent self-role-change
    if (id === requesterId && input.role !== undefined && input.role !== user.role) {
      throw new AuthError('Cannot change your own role', 'SELF_ROLE_CHANGE');
    }

    // Check email uniqueness if changing
    if (input.email && input.email !== user.email) {
      const existing = await this.userRepository.findByEmail(input.email);
      if (existing) {
        throw new AuthError('Email already in use', 'EMAIL_EXISTS');
      }
    }

    const updated = await this.userRepository.update(id, input);
    if (!updated) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }
    return updated;
  }

  /** Change a user's password with current password verification (RVS-018) */
  async changePasswordWithVerification(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new AuthError('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    const valid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new AuthError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await AuthService.hashPassword(newPassword);
    await this.userRepository.updatePassword(id, passwordHash);
  }

  /** Change a user's password (superadmin reset — no current password needed) */
  async changePassword(id: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new AuthError('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    const passwordHash = await AuthService.hashPassword(newPassword);
    await this.userRepository.updatePassword(id, passwordHash);
  }

  /** Delete a user (prevents self-deletion and last-superadmin deletion) */
  async deleteUser(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new AuthError('Cannot delete your own account', 'SELF_DELETE');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    // Prevent deleting the last superadmin
    if (user.role === 'superadmin') {
      const superadminCount = await this.userRepository.countByRole('superadmin', id);
      if (superadminCount === 0) {
        throw new AuthError('Cannot delete the last superadmin', 'LAST_SUPERADMIN');
      }
    }

    await this.userRepository.delete(id);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
