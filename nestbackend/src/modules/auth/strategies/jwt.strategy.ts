import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';

import { TokenService } from '../services/token.service';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';

/**
 * Passport strategy that verifies our RS256 access tokens via the local
 * keystore. Downstream services would use a JWKS-fetching verifier instead.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly tokenService: TokenService) {
    super();
  }

  async validate(req: Request): Promise<AuthenticatedPrincipal> {
    const header = req.headers['authorization'];
    if (!header || Array.isArray(header) || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const payload = await this.tokenService.verifyAccessToken(token);
    return this.toPrincipal(payload);
  }

  private toPrincipal(payload: JwtAccessPayload): AuthenticatedPrincipal {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      typ: payload.typ,
      scopes: (payload.scope ?? '').split(' ').filter(Boolean),
      jti: payload.jti,
    };
  }
}

export interface AuthenticatedPrincipal {
  id: string;
  email?: string;
  role?: string;
  typ: 'user' | 'service';
  scopes: string[];
  jti: string;
}
