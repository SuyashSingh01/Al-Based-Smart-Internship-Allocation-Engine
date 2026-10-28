import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Upper bound on students in one batch job — keeps a single job bounded. */
export const MAX_BATCH_STUDENTS = 1000;

@InputType()
export class MatchRequestInput {
  /** Students to rank. Omit (or pass []) to rank every student profile. */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_STUDENTS)
  @IsUUID('all', { each: true })
  studentIds?: string[];

  /** Internship pool. Omit to use every active internship with free seats. */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  internshipIds?: string[];

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  diversityBoost: boolean;

  @Field(() => Int, { defaultValue: 10 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMatchesPerStudent: number;

  /** Matches scoring below this (0..1) are dropped by the ML service. */
  @Field(() => Float, { defaultValue: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  minScoreThreshold: number;
}

@InputType()
export class SingleMatchInput {
  /** Required for admins. Ignored for students (their own profile is used). */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  internshipIds?: string[];

  @Field(() => Int, { defaultValue: 10 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMatches: number;
}
