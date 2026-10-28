import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

export interface RequestDescriptor {
  /** e.g. `query:students`, `mutation:login`, `POST /oauth/token` */
  op: string;
  req?: Request & { user?: { id?: string }; requestId?: string };
  res?: Response;
}

/** Normalise GraphQL and HTTP execution contexts into one shape for interceptors. */
export function describeRequest(context: ExecutionContext): RequestDescriptor {
  if (context.getType<'graphql' | 'http'>() === 'graphql') {
    const gql = GqlExecutionContext.create(context);
    const info = gql.getInfo<{ fieldName: string; operation?: { operation: string } }>();
    const { req, res } = gql.getContext<{ req?: Request; res?: Response }>();
    return { op: `${info?.operation?.operation ?? 'gql'}:${info?.fieldName}`, req, res };
  }
  const http = context.switchToHttp();
  const req = http.getRequest<Request>();
  return { op: `${req.method} ${req.path}`, req, res: http.getResponse<Response>() };
}

/**
 * Return the request's correlation id, creating it on first use. Honours an
 * incoming `x-request-id` so ids can be propagated from a gateway / caller,
 * and echoes it back in the response header.
 */
export function ensureRequestId(d: RequestDescriptor): string {
  if (!d.req) return 'n/a';
  if (!d.req.requestId) {
    const incoming = d.req.headers?.['x-request-id'];
    d.req.requestId = typeof incoming === 'string' && incoming ? incoming.slice(0, 64) : randomUUID();
    if (d.res && !d.res.headersSent) d.res.setHeader('x-request-id', d.req.requestId);
  }
  return d.req.requestId;
}
