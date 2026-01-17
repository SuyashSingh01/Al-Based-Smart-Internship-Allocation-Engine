import { Module } from '@nestjs/common';
import { ApplicationsResolver } from './applications.resolver';

@Module({
  providers: [ApplicationsResolver]
})
export class ApplicationsModule {}
