import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { UserRepository } from './repository';

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

const TOKEN_EXPIRY_HOURS = 24;
const BCRYPT_ROUNDS = 12;

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

  /** Verify a password against a hash (supports bcrypt and legacy sha256) */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Support legacy sha256 hashes from seed
    if (!hash.startsWith('$2')) {
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      return sha256 === hash;
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
    const sessionToken = crypto.randomBytes(32).toString('hex');

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
