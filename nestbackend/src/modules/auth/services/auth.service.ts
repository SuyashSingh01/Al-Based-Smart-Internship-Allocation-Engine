import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../../enums/auth/user-role';
import { AuthProvider } from '../enums/auth-provider.enum';
import { TokenService, TokenPair } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginInput } from '../dto/login.input';
import { RegisterInput } from '../dto/register.input';

export interface AuthenticatedResponse {
  user: Omit<User, 'password' | 'refreshTokenHash'>;
  tokens: TokenPair;
}

/**
 * Central auth flows. Every path funnels through `issueSession` so all the
 * bookkeeping (refresh persistence, last-login) lives in one place.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  // ------------------------------------------------------------------
  // Local email / password
  // ------------------------------------------------------------------
  async register(input: RegisterInput): Promise<AuthenticatedResponse> {
    const role = input.role ?? UserRole.STUDENT;
    // Self-service sign-up may only create STUDENT or COMPANY accounts.
    // Admins are provisioned out-of-band (seed script / existing admin).
    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot self-register as admin');
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, this.BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email,
      name: input.name.trim(),
      password: passwordHash,
      role,
      authProvider: AuthProvider.LOCAL,
      emailVerified: false,
    });
    const saved = await this.userRepo.save(user);
    return this.issueSession(saved);
  }

  async login(input: LoginInput): Promise<AuthenticatedResponse> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: input.email.trim().toLowerCase() })
      .getOne();

    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueSession(user);
  }

  // ------------------------------------------------------------------
  // OAuth / passwordless entry points converge here
  // ------------------------------------------------------------------
  async loginWithOAuthUser(user: User): Promise<AuthenticatedResponse> {
    return this.issueSession(user);
  }

  // ------------------------------------------------------------------
  // Refresh + logout
  // ------------------------------------------------------------------
  async refresh(refreshToken: string): Promise<AuthenticatedResponse> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    // Rotate: verify + mark parent as replaced + issue new pair sharing family.
    const { familyId } = await this.refreshTokens.rotate(payload.sub, payload.jti, refreshToken);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: this.scopesForRole(user.role),
    });

    await this.refreshTokens.markReplaced(
      user.id,
      payload.jti,
      tokens.refreshJti,
      tokens.refreshTokenExpiresIn,
    );
    await this.refreshTokens.store(
      user.id,
      tokens.refreshJti,
      tokens.refreshToken,
      tokens.refreshTokenExpiresIn,
      familyId,
    );

    return { user: this.stripSensitive(user), tokens };
  }

  async logout(userId: string, refreshJti?: string): Promise<void> {
    if (refreshJti) {
      await this.refreshTokens.revoke(userId, refreshJti);
    } else {
      await this.refreshTokens.revokeAllForUser(userId);
    }
  }

  /**
   * RFC 7009 revocation: the caller proves possession of the refresh token it
   * wants revoked. Per spec, invalid tokens are not an error (no oracle).
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      await this.refreshTokens.revoke(payload.sub, payload.jti);
    } catch {
      this.logger.debug('Revocation requested for an invalid/expired token; ignoring');
    }
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------
  private async issueSession(user: User): Promise<AuthenticatedResponse> {
    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: this.scopesForRole(user.role),
    });

    const familyId = randomUUID();
    await this.refreshTokens.store(
      user.id,
      tokens.refreshJti,
      tokens.refreshToken,
      tokens.refreshTokenExpiresIn,
      familyId,
    );

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);
    await this.usersService.invalidate(user);

    return { user: this.stripSensitive(user), tokens };
  }

  private scopesForRole(role?: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'user:read user:write matching:read matching:write admin';
      case UserRole.COMPANY:
        return 'user:read internship:write application:read';
      case UserRole.STUDENT:
      default:
        return 'user:read student:write application:write matching:read';
    }
  }

  private stripSensitive(user: User): Omit<User, 'password' | 'refreshTokenHash'> {
    const { password, refreshTokenHash, ...rest } = user as User & {
      password?: string;
      refreshTokenHash?: string;
    };
    return rest;
  }
}
