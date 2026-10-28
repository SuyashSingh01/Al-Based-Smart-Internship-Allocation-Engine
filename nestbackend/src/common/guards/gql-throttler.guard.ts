import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * ThrottlerGuard that works for both REST and GraphQL.
 *
 * The stock guard reads the request via `switchToHttp()`, which is `undefined`
 * inside a GraphQL resolver, so every GraphQL call would crash. We pull the
 * request/response out of the GraphQL context instead.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext<{ req: Request; res: Response }>();
      return { req: ctx.req, res: ctx.res };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest<Request>(), res: http.getResponse<Response>() };
  }
}
