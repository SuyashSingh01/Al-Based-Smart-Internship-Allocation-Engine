import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MatchingService } from './matching.service';
import { MatchingResolver } from './matching.resolver';

@Module({
  imports: [ConfigModule],
  providers: [MatchingService, MatchingResolver],
  exports: [MatchingService],
})
export class MatchingModule {}
