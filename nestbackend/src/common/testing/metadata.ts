import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { GqlAuthGuard } from '../../modules/auth/guards/gql-auth.guard';
import type { UserRole } from '../../enums/auth/user-role';

type Ctor = { prototype: object };
const handler = (cls: Ctor, method: string) =>
  (cls.prototype as Record<string, (...args: unknown[]) => unknown>)[method];

/** Roles required by `@Roles()` on a resolver method (method overrides class). */
export function rolesOf(cls: Ctor, method: string): UserRole[] | undefined {
  return (
    Reflect.getMetadata(ROLES_KEY, handler(cls, method)) ?? Reflect.getMetadata(ROLES_KEY, cls)
  );
}

/** True if GqlAuthGuard applies to the method (directly or via the class). */
export function requiresAuth(cls: Ctor, method: string): boolean {
  const guards: unknown[] = [
    ...(Reflect.getMetadata(GUARDS_METADATA, cls) ?? []),
    ...(Reflect.getMetadata(GUARDS_METADATA, handler(cls, method)) ?? []),
  ];
  return guards.includes(GqlAuthGuard);
}

/** True if a per-route `@Throttle()` override is set on the method. */
export function hasThrottleOverride(cls: Ctor, method: string): boolean {
  return Reflect.getMetadataKeys(handler(cls, method)).some(
    (k) => typeof k === 'string' && k.startsWith('THROTTLER:LIMIT'),
  );
}
