import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from './token.service';

/**
 * RFC 7662 token introspection.
 *
 * Downstream services (or opaque-token clients) POST their bearer token here
 * and we return `{active: true, ...}` with the standard claim set. Any error
 * during verification returns `{active: false}` per spec §2.2.
 */
@Injectable()
export class IntrospectionService {
  private readonly logger = new Logger(IntrospectionService.name);

  constructor(private readonly tokens: TokenService) {}

  async introspect(token: string): Promise<Record<string, unknown>> {
    try {
      const payload = await this.tokens.verifyAccessToken(token);
      return {
        active: true,
        sub: payload.sub,
        iss: payload.iss,
        aud: payload.aud,
        iat: payload.iat,
        exp: payload.exp,
        jti: payload.jti,
        scope: payload.scope,
        token_type: 'Bearer',
        client_id: payload.typ === 'service' ? payload.sub.replace(/^service:/, '') : undefined,
        username: payload.email,
        role: payload.role,
        typ: payload.typ,
      };
    } catch (err) {
      this.logger.debug(`Introspection: inactive token (${(err as Error).message})`);
      return { active: false };
    }
  }
}
