import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

@InputType()
export class MatchRequestInput {
  @Field(() => [String])
  studentIds: string[];

  @Field(() => [String], { nullable: true })
  internshipIds?: string[];

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  diversityBoost: boolean;

  @Field(() => Int, { defaultValue: 10 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMatchesPerStudent: number;

  @Field(() => Float, { defaultValue: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  minScoreThreshold: number;
}

@InputType()
export class SingleMatchInput {
  @Field()
  studentId: string;

  @Field(() => [String], { nullable: true })
  internshipIds?: string[];

  @Field(() => Int, { defaultValue: 10 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMatches: number;
}
