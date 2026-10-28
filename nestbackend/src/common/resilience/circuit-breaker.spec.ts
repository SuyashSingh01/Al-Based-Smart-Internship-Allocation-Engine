import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  const fail = () => Promise.reject(new Error('boom'));
  const ok = () => Promise.resolve('ok');

  beforeEach(() => jest.useFakeTimers({ now: 0 }));
  afterEach(() => jest.useRealTimers());

  it('opens after N consecutive failures and then fails fast without calling', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    for (let i = 0; i < 3; i++) await expect(breaker.exec(fail)).rejects.toThrow('boom');
    expect(breaker.currentState).toBe('OPEN');

    const fn = jest.fn(ok);
    await expect(breaker.exec(fn)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('a success resets the failure count', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });
    await expect(breaker.exec(fail)).rejects.toThrow();
    await breaker.exec(ok);
    await expect(breaker.exec(fail)).rejects.toThrow();
    expect(breaker.currentState).toBe('CLOSED');
  });

  it('after cooldown admits exactly one probe; success closes it', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });
    await expect(breaker.exec(fail)).rejects.toThrow();
    jest.setSystemTime(1500);

    let release!: (v: string) => void;
    const probe = breaker.exec(() => new Promise<string>((r) => (release = r)));
    await expect(breaker.exec(ok)).rejects.toBeInstanceOf(CircuitOpenError); // second caller blocked
    release('ok');
    await expect(probe).resolves.toBe('ok');
    expect(breaker.currentState).toBe('CLOSED');
  });

  it('a failed probe re-opens for another cooldown', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });
    await expect(breaker.exec(fail)).rejects.toThrow();
    jest.setSystemTime(1500);
    await expect(breaker.exec(fail)).rejects.toThrow('boom');
    expect(breaker.currentState).toBe('OPEN');
  });
});
