/**
 * OIDC-flavoured JWT claim set we use across services.
 *
 * We extend the loose index signature so these types satisfy `jose`'s JWTPayload.
 */
export interface JwtAccessPayload {
  [key: string]: unknown;
  /** Standard "subject" — user id or service account id. */
  sub: string;
  /** Standard "issuer" — our auth service URL. */
  iss: string;
  /** Standard "audience" — the intended consumer(s). */
  aud: string | string[];
  /** Standard "issued at". */
  iat: number;
  /** Standard "expiry". */
  exp: number;
  /** Unique token id — indexed for revocation. */
  jti: string;
  /** Principal type: user vs service. */
  typ: 'user' | 'service';
  /** Space-separated OAuth 2.0 scopes. */
  scope: string;
  /** Role claim for RBAC on the user side. */
  role?: string;
  /** Convenience claim for user identity. Do not treat as authoritative. */
  email?: string;
}

export interface JwtRefreshPayload {
  [key: string]: unknown;
  sub: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  jti: string;
  typ: 'refresh';
}

export type AnyJwtPayload = JwtAccessPayload | JwtRefreshPayload;
