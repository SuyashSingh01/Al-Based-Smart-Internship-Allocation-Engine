import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { describeRequest, ensureRequestId } from './request-context';

/** Latency log line for every GraphQL operation and REST call, tagged with the request id. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const d = describeRequest(context);
    const requestId = ensureRequestId(d);

    return next.handle().pipe(
      tap(() => this.logger.log(`[${requestId}] ${d.op} - ${Date.now() - start}ms`)),
    );
  }
}
