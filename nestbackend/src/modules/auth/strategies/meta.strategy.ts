import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';

import { AuthProvider } from '../enums/auth-provider.enum';
import { OAuthProfile } from '../interfaces/oauth-profile.interface';

/**
 * "Meta" strategy — Facebook Login (Meta rebranded the platform, endpoints
 * remain under facebook.com). The dependency is still `passport-facebook`.
 */
@Injectable()
export class MetaStrategy extends PassportStrategy(Strategy, 'meta') {
  private readonly logger = new Logger(MetaStrategy.name);

  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('META_CLIENT_ID', 'missing'),
      clientSecret: config.get<string>('META_CLIENT_SECRET', 'missing'),
      callbackURL: config.get<string>(
        'META_CALLBACK_URL',
        'http://localhost:3000/auth/meta/callback',
      ),
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email', 'public_profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: OAuthProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Meta profile has no email — request "email" scope explicitly'));
    }
    const normalized: OAuthProfile = {
      provider: AuthProvider.META,
      providerAccountId: profile.id,
      email,
      // Facebook doesn't expose an "email_verified" bit, so we can't vouch for
      // it. Treat as unverified: brand-new accounts still work, but we never
      // auto-link to an existing account by email (see OAuthService).
      emailVerified: false,
      name: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value,
      raw: profile._json,
    };
    done(null, normalized);
  }
}
