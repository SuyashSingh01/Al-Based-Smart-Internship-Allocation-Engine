import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsResolver } from './applications.resolver';
import { StudentsModule } from '../students/students.module';
import { InternshipsModule } from '../internships/internships.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application]), StudentsModule, InternshipsModule],
  providers: [ApplicationsService, ApplicationsResolver],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
