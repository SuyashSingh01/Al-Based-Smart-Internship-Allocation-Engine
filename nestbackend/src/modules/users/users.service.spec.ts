import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CacheService } from '../../common/cache/cache.service';

/** Minimal in-memory stand-in for CacheService's cache-aside API. */
class FakeCache {
  store = new Map<string, unknown>();
  async getOrSet<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.store.has(key)) return this.store.get(key) as T;
    const v = await loader();
    if (v !== null && v !== undefined) this.store.set(key, v);
    return v;
  }
  async del(...keys: string[]) {
    keys.forEach((k) => this.store.delete(k));
  }
}

describe('UsersService (cache-aside)', () => {
  const repo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)) };
  let cache: FakeCache;
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new FakeCache();
    service = new UsersService(repo as unknown as Repository<User>, cache as unknown as CacheService);
  });

  it('hits the database once, then serves from cache', async () => {
    repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c' });
    await service.findById('u1');
    await service.findById('u1');
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  it('does not cache misses', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.findById('ghost');
    await service.findById('ghost');
    expect(repo.findOne).toHaveBeenCalledTimes(2);
  });

  it('invalidate() evicts both id and email keys', async () => {
    repo.findOne.mockResolvedValue({ id: 'u1', email: 'A@B.c' });
    await service.findById('u1');
    await service.findByEmail('A@B.c');
    await service.invalidate({ id: 'u1', email: 'A@B.c' });
    expect(cache.store.size).toBe(0);
  });
});
