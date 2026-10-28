import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '../auth.constants';
import { ClientCredentialsService } from '../services/client-credentials.service';
import { IntrospectionService } from '../services/introspection.service';
import { AuthService } from '../services/auth.service';

/**
 * OAuth 2.0 token endpoints:
 *
 *   POST /oauth/token       (RFC 6749) — grants: client_credentials, refresh_token, password
 *   POST /oauth/introspect  (RFC 7662)
 *   POST /oauth/revoke      (RFC 7009)
 */
@Controller('oauth')
export class TokenController {
  constructor(
    private readonly clientCreds: ClientCredentialsService,
    private readonly introspection: IntrospectionService,
    private readonly authService: AuthService,
  ) {}

  @Post('token')
  @HttpCode(200)
  @Throttle(CREDENTIAL_THROTTLE)
  async token(
    @Body()
    body: {
      grant_type: string;
      client_id?: string;
      client_secret?: string;
      scope?: string;
      refresh_token?: string;
      username?: string;
      password?: string;
    },
  ) {
    switch (body.grant_type) {
      case 'client_credentials': {
        if (!body.client_id || !body.client_secret) {
          throw new BadRequestException('invalid_request: client_id and client_secret required');
        }
        return this.clientCreds.issue(body.client_id, body.client_secret, body.scope);
      }
      case 'refresh_token': {
        if (!body.refresh_token) throw new BadRequestException('invalid_request');
        const { tokens } = await this.authService.refresh(body.refresh_token);
        return this.formatTokenResponse(tokens);
      }
      case 'password': {
        if (!body.username || !body.password) {
          throw new BadRequestException('invalid_request');
        }
        const { tokens } = await this.authService.login({
          email: body.username,
          password: body.password,
        } as { email: string; password: string });
        return this.formatTokenResponse(tokens);
      }
      default:
        throw new BadRequestException('unsupported_grant_type');
    }
  }

  @Post('introspect')
  @HttpCode(200)
  introspect(@Body() body: { token: string }) {
    if (!body?.token) throw new BadRequestException('missing token');
    return this.introspection.introspect(body.token);
  }

  /**
   * RFC 7009: the body carries the refresh token itself (proof of possession).
   * Accepting a bare user id here would let anyone log out any user.
   */
  @Post('revoke')
  @HttpCode(200)
  async revoke(@Body() body: { token: string }) {
    if (!body?.token) throw new BadRequestException('missing token');
    await this.authService.revokeRefreshToken(body.token);
    return { revoked: true };
  }

  private formatTokenResponse(tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  }) {
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.accessTokenExpiresIn,
      refresh_expires_in: tokens.refreshTokenExpiresIn,
      token_type: 'Bearer',
    };
  }
}
