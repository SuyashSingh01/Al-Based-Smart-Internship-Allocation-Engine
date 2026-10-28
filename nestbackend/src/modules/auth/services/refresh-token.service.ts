import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CacheService } from '../../../common/cache/cache.service';

/**
 * Refresh-token bookkeeping in Redis.
 *
 * We store one key per issued refresh jti:
 *
 *   refresh:{userId}:{jti} -> { hash, familyId, replacedBy? }
 *
 * On rotation the parent is marked with `replacedBy = newJti`. If a client
 * ever presents a refresh token whose jti is already marked replaced, we
 * treat it as a *stolen* refresh and revoke the entire token family. This is
 * the reuse-detection pattern popularised by Auth0.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(private readonly cache: CacheService) {}

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private familyIndex(familyId: string): string {
    return `refresh-family:${familyId}`;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async store(
    userId: string,
    jti: string,
    token: string,
    ttlSeconds: number,
    familyId: string,
  ): Promise<void> {
    const record = { hash: this.hash(token), familyId };
    await this.cache.set(this.key(userId, jti), record, ttlSeconds);
    // Track the family so we can nuke it on reuse.
    await this.cache.getClient().sadd(this.familyIndex(familyId), `${userId}:${jti}`);
    await this.cache.getClient().expire(this.familyIndex(familyId), ttlSeconds);
  }

  /**
   * Validate a presented refresh token and rotate it. Returns the family id
   * of the rotation so callers can persist a new record under it.
   *
   * Throws UnauthorizedException on:
   *  - missing record (already used, revoked, or forged)
   *  - hash mismatch (forged)
   *  - record already marked replaced (reuse detected -> revoke family)
   */
  async rotate(userId: string, jti: string, presentedToken: string): Promise<{ familyId: string }> {
    const record = await this.cache.get<{ hash: string; familyId: string; replacedBy?: string }>(
      this.key(userId, jti),
    );

    if (!record) {
      this.logger.warn(`Refresh reuse: no record for user=${userId} jti=${jti}`);
      throw new UnauthorizedException('Refresh token invalid');
    }
    if (record.hash !== this.hash(presentedToken)) {
      this.logger.warn(`Refresh mismatch for user=${userId} jti=${jti}`);
      throw new UnauthorizedException('Refresh token invalid');
    }
    if (record.replacedBy) {
      this.logger.error(
        `REFRESH REUSE DETECTED for user=${userId} jti=${jti}; revoking family ${record.familyId}`,
      );
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token already used; family revoked');
    }
    return { familyId: record.familyId };
  }

  /** Mark a jti as replaced (rotated). */
  async markReplaced(userId: string, jti: string, newJti: string, ttlSeconds: number): Promise<void> {
    const record = await this.cache.get<{ hash: string; familyId: string }>(this.key(userId, jti));
    if (!record) return;
    await this.cache.set(
      this.key(userId, jti),
      { ...record, replacedBy: newJti },
      ttlSeconds,
    );
  }

  async revoke(userId: string, jti: string): Promise<void> {
    await this.cache.del(this.key(userId, jti));
  }

  async revokeFamily(familyId: string): Promise<void> {
    const members: string[] = await this.cache.getClient().smembers(this.familyIndex(familyId));
    const keys = members.map((m) => {
      const [userId, jti] = m.split(':');
      return this.key(userId, jti);
    });
    if (keys.length) await this.cache.del(...keys);
    await this.cache.del(this.familyIndex(familyId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.cache.invalidatePrefix(`refresh:${userId}:`);
  }
}
