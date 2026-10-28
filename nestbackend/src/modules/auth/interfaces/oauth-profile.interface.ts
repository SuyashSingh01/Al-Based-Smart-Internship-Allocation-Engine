import { AuthProvider } from '../enums/auth-provider.enum';

/**
 * Provider-agnostic identity snapshot passed from strategies to OAuthService.
 * Every social strategy normalises its raw profile into this shape.
 */
export interface OAuthProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
  raw?: unknown;
}
