import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesResolver } from './companies.resolver';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesResolver]
})
export class CompaniesModule {}
