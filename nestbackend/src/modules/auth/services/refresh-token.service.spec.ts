import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { CacheService } from '../../../common/cache/cache.service';

/** In-memory fake of the CacheService + raw Redis set commands used by the service. */
function fakeCache() {
  const kv = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  const client = {
    sadd: async (k: string, v: string) => void (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(v),
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
    expire: async () => 1,
  };
  return {
    kv,
    get: async (k: string) => (kv.has(k) ? structuredClone(kv.get(k)) : null),
    set: async (k: string, v: unknown) => void kv.set(k, structuredClone(v)),
    del: async (...keys: string[]) => keys.forEach((k) => (kv.delete(k), sets.delete(k))),
    invalidatePrefix: async (p: string) => [...kv.keys()].filter((k) => k.startsWith(p)).forEach((k) => kv.delete(k)),
    getClient: () => client,
  };
}

describe('RefreshTokenService (rotation + reuse detection)', () => {
  let cache: ReturnType<typeof fakeCache>;
  let service: RefreshTokenService;

  beforeEach(async () => {
    cache = fakeCache();
    service = new RefreshTokenService(cache as unknown as CacheService);
    await service.store('u1', 'jti-1', 'token-1', 600, 'fam');
  });

  it('accepts a valid, unused refresh token', async () => {
    await expect(service.rotate('u1', 'jti-1', 'token-1')).resolves.toEqual({ familyId: 'fam' });
  });

  it('rejects a token whose hash does not match (forged)', async () => {
    await expect(service.rotate('u1', 'jti-1', 'forged')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('on reuse of a rotated token, revokes the whole family', async () => {
    // Legit rotation: jti-1 -> jti-2 in the same family.
    await service.rotate('u1', 'jti-1', 'token-1');
    await service.markReplaced('u1', 'jti-1', 'jti-2', 600);
    await service.store('u1', 'jti-2', 'token-2', 600, 'fam');

    // Attacker replays the old token.
    await expect(service.rotate('u1', 'jti-1', 'token-1')).rejects.toThrow('family revoked');

    // The legitimate *new* token is dead too — the session must re-authenticate.
    await expect(service.rotate('u1', 'jti-2', 'token-2')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout-all removes every refresh token for the user', async () => {
    await service.store('u1', 'jti-9', 'token-9', 600, 'fam2');
    await service.revokeAllForUser('u1');
    expect([...cache.kv.keys()].filter((k) => k.startsWith('refresh:u1:'))).toHaveLength(0);
  });
});
