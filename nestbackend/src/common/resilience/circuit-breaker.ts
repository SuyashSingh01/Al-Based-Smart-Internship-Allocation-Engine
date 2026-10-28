import { Logger } from '@nestjs/common';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  name?: string;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Minimal state-machine circuit breaker (CLOSED -> OPEN -> HALF_OPEN -> CLOSED).
 *
 * - CLOSED: calls pass through; consecutive failures are counted.
 * - OPEN: after `failureThreshold` consecutive failures, calls fail fast with
 *   CircuitOpenError for `cooldownMs` (no network call at all).
 * - HALF_OPEN: after the cooldown, exactly one probe call is admitted. Success
 *   closes the breaker; failure re-opens it for another cooldown.
 *
 * State is per-process. With N replicas each has its own breaker, which is
 * fine for fail-fast purposes. Swap for `opossum` if you need metrics/events.
 */
export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = 'CLOSED';
  private openedAt = 0;
  private probeInFlight = false;
  private readonly logger: Logger;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.name = opts.name ?? 'default';
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.logger = new Logger(`CircuitBreaker:${this.name}`);
  }

  get currentState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'HALF_OPEN';
      this.logger.warn('Cooldown elapsed; half-opening breaker');
    }
    return this.state;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.currentState;
    if (state === 'OPEN') throw new CircuitOpenError(this.name);
    if (state === 'HALF_OPEN') {
      if (this.probeInFlight) throw new CircuitOpenError(this.name);
      this.probeInFlight = true;
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    } finally {
      if (state === 'HALF_OPEN') this.probeInFlight = false;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'HALF_OPEN') this.logger.log('Probe succeeded; closing breaker');
    this.state = 'CLOSED';
    this.failures = 0;
  }

  private recordFailure(): void {
    this.failures += 1;
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      if (this.state !== 'OPEN') this.logger.error(`Opening breaker after ${this.failures} failures`);
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}
