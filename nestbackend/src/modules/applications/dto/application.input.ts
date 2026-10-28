import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

@InputType()
export class CreateApplicationInput {
  /** Ignored for STUDENT callers (taken from their own profile). Required for admins. */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @Field(() => ID)
  @IsUUID()
  internshipId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;
}

@InputType()
export class UpdateApplicationStatusInput {
  @Field(() => ApplicationStatus)
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
