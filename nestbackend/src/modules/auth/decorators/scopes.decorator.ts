import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'auth:scopes';

/**
 * Restrict a resolver / route to principals whose token carries all listed
 * OAuth 2.0 scopes. Applied on top of GqlAuthGuard / JwtAuthGuard.
 */
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);
