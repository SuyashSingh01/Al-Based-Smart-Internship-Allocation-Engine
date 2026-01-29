import { Module } from '@nestjs/common';
import { InternshipsService } from './internships.service';
import { InternshipsResolver } from './internships.resolver';

@Module({
  providers: [InternshipsService, InternshipsResolver]
})
export class InternshipsModule {}
