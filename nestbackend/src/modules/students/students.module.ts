import { Module } from '@nestjs/common';
import { StudentsResolver } from './students.resolver';

@Module({
  providers: [StudentsResolver]
})
export class StudentsModule {}
