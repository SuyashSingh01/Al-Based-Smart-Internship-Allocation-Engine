import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { AuthService } from '../services/auth.service';
import { OAuthService } from '../services/oauth.service';
import { OAuthProfile } from '../interfaces/oauth-profile.interface';

/**
 * OAuth callback endpoints. Redirect the browser here, Passport handles the
 * OAuth 2.0 handshake, and we finish by issuing our own JWT pair and
 * redirecting to the frontend with tokens in the query string (or a cookie).
 *
 * For production, use a short-lived one-time code + `code -> token` exchange
 * instead of putting tokens in the URL. For a demo, tokens-in-URL is fine.
 */
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  // ---------- Google ----------
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleStart(): void {
    // Passport handles the redirect.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.completeOAuth(req, res);
  }

  // ---------- Meta / Facebook ----------
  @Get('meta')
  @UseGuards(AuthGuard('meta'))
  metaStart(): void {}

  @Get('meta/callback')
  @UseGuards(AuthGuard('meta'))
  async metaCallback(@Req() req: Request, @Res() res: Response) {
    return this.completeOAuth(req, res);
  }

  private async completeOAuth(req: Request, res: Response) {
    const profile = req.user as OAuthProfile | undefined;
    if (!profile) {
      return res.status(401).json({ error: 'oauth_failed' });
    }
    const user = await this.oauthService.upsertUserFromProfile(profile);
    const { tokens } = await this.authService.loginWithOAuthUser(user);

    const frontend = process.env.FRONTEND_OAUTH_REDIRECT ?? '';
    if (frontend) {
      const url = new URL(frontend);
      url.searchParams.set('access_token', tokens.accessToken);
      url.searchParams.set('refresh_token', tokens.refreshToken);
      url.searchParams.set('expires_in', String(tokens.accessTokenExpiresIn));
      return res.redirect(url.toString());
    }
    return res.json({ user, tokens });
  }
}
