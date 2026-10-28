import { Module } from '@nestjs/common';
import { StatsResolver } from './stats.resolver';
import { StatsService } from './stats.service';

@Module({
  providers: [StatsResolver, StatsService],
})
export class StatsModule {}
