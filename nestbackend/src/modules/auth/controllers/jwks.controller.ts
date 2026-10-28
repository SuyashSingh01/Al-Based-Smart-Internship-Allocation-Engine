import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { KeystoreService } from '../services/keystore.service';

@ApiExcludeController()
@Controller('.well-known')
export class JwksController {
  constructor(private readonly keystore: KeystoreService) {}

  @Get('jwks.json')
  jwks() {
    return this.keystore.getJwks();
  }

  @Get('openid-configuration')
  openidConfig() {
    // Minimal OIDC discovery document — enough for standard client libs.
    const base = process.env.JWT_ISSUER ?? 'http://localhost:3000';
    return {
      issuer: base,
      jwks_uri: `${base}/.well-known/jwks.json`,
      token_endpoint: `${base}/oauth/token`,
      introspection_endpoint: `${base}/oauth/introspect`,
      response_types_supported: ['token'],
      grant_types_supported: ['password', 'refresh_token', 'client_credentials', 'authorization_code'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'user:read',
        'user:write',
        'internship:write',
        'application:read',
        'application:write',
        'matching:read',
        'matching:write',
        'admin',
      ],
    };
  }
}
