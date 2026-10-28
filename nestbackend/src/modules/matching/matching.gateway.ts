import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/services/token.service';
import { UserRole } from '../../enums/auth/user-role';

export interface JobUpdatePayload {
  status: string;
  processed?: number;
  failed?: number;
  total?: number;
  result?: Record<string, unknown>;
  error?: string;
}

const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Real-time push for matching job status (namespace `/matching`).
 *
 * Auth: the client passes its access token on connect —
 *   io('/matching', { auth: { token: '<access token>' } })
 * (or an `Authorization: Bearer` header). Only admins may connect, because
 * batch jobs and their results are admin-only.
 *
 * Then: emit `subscribeJob` with the job id → receive `jobUpdate` events.
 *
 * Scaling note: with several API replicas, the worker emitting an update may
 * not be the replica holding the socket. Add `@socket.io/redis-adapter` so
 * rooms are shared across replicas via Redis pub/sub.
 */
@WebSocketGateway({ namespace: '/matching', cors: { origin: allowedOrigins, credentials: true } })
export class MatchingGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MatchingGateway.name);

  constructor(private readonly tokens: TokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('missing token');
      const payload = await this.tokens.verifyAccessToken(token);
      if (payload.role !== UserRole.ADMIN) throw new Error('admin role required');
      client.data.userId = payload.sub;
    } catch (err) {
      this.logger.warn(`Rejecting socket ${client.id}: ${(err as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribeJob')
  async subscribeJob(@MessageBody() jobId: string, @ConnectedSocket() client: Socket) {
    if (!client.data.userId || typeof jobId !== 'string') return { event: 'error', data: 'Unauthorized' };
    await client.join(`job:${jobId}`);
    return { event: 'subscribed', data: { jobId } };
  }

  @SubscribeMessage('unsubscribeJob')
  async unsubscribeJob(@MessageBody() jobId: string, @ConnectedSocket() client: Socket) {
    await client.leave(`job:${jobId}`);
    return { event: 'unsubscribed', data: { jobId } };
  }

  /** Push a lifecycle update to everyone subscribed to this job. */
  emitJobUpdate(jobId: string, payload: JobUpdatePayload): void {
    this.server?.to(`job:${jobId}`).emit('jobUpdate', { jobId, ...payload });
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = (client.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');
    const header = client.handshake.headers.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
