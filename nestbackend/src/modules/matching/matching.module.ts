import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { MatchingService } from './matching.service';
import { MatchingResolver } from './matching.resolver';
import { MatchingGateway } from './matching.gateway';
import { MlClientService } from './ml-client.service';
import { MatchingJob } from './entities/matching-job.entity';
import { MatchScore } from './entities/match.entity';
import { MatchingProcessor } from './queue/matching.processor';
import { MATCHING_QUEUE } from './queue/matching-queue.constants';
import { StudentsModule } from '../students/students.module';
import { InternshipsModule } from '../internships/internships.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MatchingJob, MatchScore]),
    BullModule.registerQueue({
      name: MATCHING_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
      },
    }),
    StudentsModule,
    InternshipsModule,
    AuthModule, // TokenService for WebSocket handshake auth
  ],
  providers: [MatchingService, MlClientService, MatchingResolver, MatchingGateway, MatchingProcessor],
  exports: [MatchingService, MlClientService],
})
export class MatchingModule {}
