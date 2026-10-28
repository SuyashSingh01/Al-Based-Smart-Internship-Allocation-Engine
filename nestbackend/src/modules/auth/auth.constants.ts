/**
 * Tighter rate limits for endpoints that accept credentials (login, register,
 * token grants). Overrides the global buckets defined in AppModule to slow
 * down password brute-forcing: 3 req/s burst, 20 req/min sustained per IP.
 */
export const CREDENTIAL_THROTTLE = {
  short: { limit: 3, ttl: 1000 },
  long: { limit: 20, ttl: 60_000 },
};
