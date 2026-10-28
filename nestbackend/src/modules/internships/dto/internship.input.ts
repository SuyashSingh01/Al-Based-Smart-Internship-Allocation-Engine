import { Field, Float, InputType, Int, PartialType } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { QualificationLevel } from '../../../enums/student.enums';

@InputType()
export class CreateInternshipInput {
  /** Ignored for COMPANY users (taken from their company). Admins: required unless companyId is set. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  companyName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  description: string;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requiredSkills: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @Field(() => QualificationLevel)
  @IsEnum(QualificationLevel)
  preferredQualification: QualificationLevel;

  @Field()
  @IsString()
  sector: string;

  @Field()
  @IsString()
  location: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  stipend?: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(12)
  durationMonths: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  capacity: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  @Max(10)
  minCgpa: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredFields?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredLanguages?: string[];

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateInternshipInput extends PartialType(CreateInternshipInput) {}
