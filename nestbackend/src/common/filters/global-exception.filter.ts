import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import type { Response } from 'express';

/**
 * Single place where every unhandled error ends up (the "bubbling" pattern).
 *
 * - GraphQL: the exception is returned and Apollo turns it into an `errors[]`
 *   entry. Unknown errors are masked so internals never leak to clients.
 * - HTTP (REST controllers: /oauth, /health, /.well-known): a JSON body is
 *   written to the response. Returning the exception here would leave the
 *   request hanging, because nothing else sends the response.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : undefined;
    const message = isHttpException
      ? typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ?? exception.message)
      : 'Internal server error';

    const err = exception instanceof Error ? exception : new Error(String(exception));
    const where =
      host.getType<'graphql' | 'http'>() === 'graphql'
        ? `gql:${GqlArgumentsHost.create(host).getInfo<{ fieldName: string }>()?.fieldName}`
        : `http:${host.switchToHttp().getRequest<{ url?: string }>()?.url}`;

    // 4xx are client mistakes: log quietly. 5xx are our bugs: log with stack.
    if (status >= 500) {
      this.logger.error(`${where} ${status} ${err.message}`, err.stack);
    } else {
      this.logger.warn(`${where} ${status} ${JSON.stringify(message)}`);
    }

    if (host.getType<'graphql' | 'http'>() === 'graphql') {
      return isHttpException ? exception : new HttpException(message, status);
    }

    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;
    res.status(status).json({
      statusCode: status,
      message,
      error: typeof body === 'object' ? (body as { error?: string }).error : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
