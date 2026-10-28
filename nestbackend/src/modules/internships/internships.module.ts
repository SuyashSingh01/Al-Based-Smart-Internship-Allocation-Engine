import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Internship } from './entities/internship.entity';
import { InternshipsService } from './internships.service';
import { InternshipsResolver } from './internships.resolver';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [TypeOrmModule.forFeature([Internship]), CompaniesModule],
  providers: [InternshipsService, InternshipsResolver],
  exports: [InternshipsService],
})
export class InternshipsModule {}
