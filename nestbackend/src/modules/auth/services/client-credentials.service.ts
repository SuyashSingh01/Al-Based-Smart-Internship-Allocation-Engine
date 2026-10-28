import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

import { TokenService } from './token.service';

/**
 * OAuth 2.0 client-credentials grant for service-to-service calls (RFC 6749 §4.4).
 *
 * Service accounts are configured via env:
 *
 *   OAUTH_CLIENTS=nest-backend:secret1:matching:read matching:write, \
 *                 ml-service:secret2:internal:read
 *
 * Each entry is `client_id:client_secret:space-separated-scopes`. Comma-separated
 * entries.
 *
 * Production should back this by a `oauth_clients` table with hashed secrets,
 * per-client rate limits, and rotation. This env-based bootstrap is a clean
 * seam for the demo without hardcoding secrets.
 */
interface RegisteredClient {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

@Injectable()
export class ClientCredentialsService {
  private readonly logger = new Logger(ClientCredentialsService.name);
  private readonly clients: Map<string, RegisteredClient>;

  constructor(
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {
    this.clients = this.parseClients(this.config.get<string>('OAUTH_CLIENTS', ''));
    this.logger.log(`Registered ${this.clients.size} service account(s)`);
  }

  async issue(
    clientId: string,
    clientSecret: string,
    requestedScope?: string,
  ): Promise<{ access_token: string; token_type: 'Bearer'; expires_in: number; scope: string }> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new UnauthorizedException('invalid_client');
    }
    if (!this.constantTimeEqual(client.clientSecret, clientSecret)) {
      throw new UnauthorizedException('invalid_client');
    }

    const granted = this.narrowScopes(client.scopes, requestedScope);

    const now = Math.floor(Date.now() / 1000);
    const token = await this.tokens.signAccessToken({
      sub: `service:${clientId}`,
      typ: 'service',
      scope: granted.join(' '),
      audience: this.config.get<string>('JWT_DEFAULT_AUDIENCE', 'internship-platform'),
    });

    // We can't peek expiry from TokenService without a helper; recompute.
    const ttl = parseInt(this.config.get<string>('JWT_ACCESS_TTL_SECONDS', '900'), 10);
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: ttl,
      scope: granted.join(' '),
    };
  }

  private parseClients(raw: string): Map<string, RegisteredClient> {
    const map = new Map<string, RegisteredClient>();
    if (!raw.trim()) return map;
    for (const entry of raw.split(',')) {
      const [clientId, clientSecret, ...scopeParts] = entry.trim().split(':');
      if (!clientId || !clientSecret) continue;
      const scopes = scopeParts.join(':').split(' ').filter(Boolean);
      map.set(clientId, { clientId, clientSecret, scopes });
    }
    return map;
  }

  private narrowScopes(granted: string[], requested?: string): string[] {
    if (!requested?.trim()) return granted;
    const req = requested.split(' ').filter(Boolean);
    const grantedSet = new Set(granted);
    return req.filter((s) => grantedSet.has(s));
  }

  private constantTimeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
