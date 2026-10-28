import { AuthResolver } from './auth.resolver';
import { hasThrottleOverride, requiresAuth } from '../../common/testing/metadata';

describe('AuthResolver', () => {
  it.each(['register', 'login'])('%s is public but has a stricter rate limit', (method) => {
    expect(requiresAuth(AuthResolver, method)).toBe(false);
    expect(hasThrottleOverride(AuthResolver, method)).toBe(true);
  });

  it.each(['logout', 'me'])('%s requires a valid access token', (method) => {
    expect(requiresAuth(AuthResolver, method)).toBe(true);
  });
});
