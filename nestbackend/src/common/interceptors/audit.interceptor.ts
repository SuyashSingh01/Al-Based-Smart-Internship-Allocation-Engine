import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { describeRequest, ensureRequestId } from './request-context';

/**
 * AuditInterceptor: structured audit trail (one JSON line per call).
 * Captures: request id, actor, operation, outcome, duration. Arguments are
 * deliberately NOT logged — they can contain passwords and PII.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const d = describeRequest(context);
    const requestId = ensureRequestId(d);
    const record = (outcome: 'success' | 'failure', error?: string) =>
      JSON.stringify({
        requestId,
        // Read lazily: the auth guard runs before the handler and populates req.user.
        actor: d.req?.user?.id ?? 'anonymous',
        op: d.op,
        outcome,
        error,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      });

    return next.handle().pipe(
      tap(() => this.logger.log(record('success'))),
      catchError((err: Error) => {
        this.logger.warn(record('failure', err.message));
        return throwError(() => err);
      }),
    );
  }
}
