import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { AuthenticatedPrincipal } from '../strategies/jwt.strategy';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = this.getRequest(context);
    const user = req?.user as AuthenticatedPrincipal | undefined;
    if (!user) throw new ForbiddenException('Authentication required');

    const held = new Set(user.scopes ?? []);
    const missing = required.filter((s) => !held.has(s));
    if (missing.length) {
      throw new ForbiddenException(`Missing required scope(s): ${missing.join(', ')}`);
    }
    return true;
  }

  private getRequest(context: ExecutionContext) {
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: unknown }>().req;
    }
    return context.switchToHttp().getRequest();
  }
}
