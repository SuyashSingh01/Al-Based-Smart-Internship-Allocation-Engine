import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { CacheService } from '../../common/cache/cache.service';

/**
 * Probes for orchestrators (Docker / Kubernetes) and uptime monitors.
 *
 *  GET /health/liveness   — process is up. Never touches dependencies, so a
 *                           Postgres outage doesn't make k8s restart-loop us.
 *  GET /health/readiness  — hard dependencies (Postgres, Redis) are reachable;
 *                           gate traffic on this.
 *  GET /health            — full report incl. ML service and memory, for humans
 *                           and dashboards. ML being down degrades matching only.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly indicator: HealthIndicatorService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const mlUrl = this.config.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redisCheck(),
      () => this.http.pingCheck('ml-service', `${mlUrl}/api/v1/health`, { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.pingCheck('database'), () => this.redisCheck()]);
  }

  @Get('liveness')
  liveness() {
    return { status: 'alive', ts: new Date().toISOString() };
  }

  private async redisCheck() {
    const indicator = this.indicator.check('redis');
    try {
      const pong = await this.cache.getClient().ping();
      return pong === 'PONG' ? indicator.up() : indicator.down({ reply: pong });
    } catch (err) {
      return indicator.down({ message: (err as Error).message });
    }
  }
}
