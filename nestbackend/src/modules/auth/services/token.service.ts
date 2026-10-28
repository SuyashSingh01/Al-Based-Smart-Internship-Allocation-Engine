import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTPayload, jwtVerify, SignJWT } from 'jose';
import { randomUUID } from 'crypto';

import { KeystoreService } from './keystore.service';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../interfaces/jwt-payload.interface';

export interface AccessTokenInput {
  sub: string;
  audience?: string | string[];
  scope?: string;
  role?: string;
  email?: string;
  typ?: 'user' | 'service';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  tokenType: 'Bearer';
  jti: string;
  refreshJti: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly keystore: KeystoreService,
    private readonly config: ConfigService,
  ) {}

  private get issuer(): string {
    return this.config.get<string>('JWT_ISSUER', 'http://localhost:3000');
  }

  private get defaultAudience(): string {
    return this.config.get<string>('JWT_DEFAULT_AUDIENCE', 'internship-platform');
  }

  private get accessTokenTtl(): number {
    return parseInt(this.config.get<string>('JWT_ACCESS_TTL_SECONDS', '900'), 10);
  }

  private get refreshTokenTtl(): number {
    return parseInt(
      this.config.get<string>('JWT_REFRESH_TTL_SECONDS', String(14 * 24 * 60 * 60)),
      10,
    );
  }

  async issueTokenPair(input: AccessTokenInput): Promise<TokenPair> {
    const jti = randomUUID();
    const refreshJti = randomUUID();
    const accessToken = await this.signAccessToken(input, jti);
    const refreshToken = await this.signRefreshToken(input.sub, refreshJti);
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessTokenTtl,
      refreshTokenExpiresIn: this.refreshTokenTtl,
      tokenType: 'Bearer',
      jti,
      refreshJti,
    };
  }

  async signAccessToken(input: AccessTokenInput, jti = randomUUID()): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtAccessPayload = {
      sub: input.sub,
      iss: this.issuer,
      aud: input.audience ?? this.defaultAudience,
      iat: now,
      exp: now + this.accessTokenTtl,
      jti,
      typ: input.typ ?? 'user',
      scope: input.scope ?? '',
      role: input.role,
      email: input.email,
    };
    return this.sign(payload);
  }

  async signRefreshToken(sub: string, jti = randomUUID()): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtRefreshPayload = {
      sub,
      iss: this.issuer,
      aud: this.defaultAudience,
      iat: now,
      exp: now + this.refreshTokenTtl,
      jti,
      typ: 'refresh',
    };
    return this.sign(payload);
  }

  async verifyAccessToken(token: string, expectedAudience?: string): Promise<JwtAccessPayload> {
    return this.verify<JwtAccessPayload>(token, expectedAudience ?? this.defaultAudience);
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    const payload = await this.verify<JwtRefreshPayload>(token, this.defaultAudience);
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Expected a refresh token');
    }
    return payload;
  }

  private async sign(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.keystore.kid, typ: 'JWT' })
      .sign(this.keystore.getPrivateKey());
  }

  private async verify<T extends JWTPayload>(token: string, audience: string): Promise<T> {
    try {
      const { payload } = await jwtVerify(token, this.keystore.getPublicKey(), {
        issuer: this.issuer,
        audience,
        algorithms: ['RS256'],
      });
      return payload as T;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
