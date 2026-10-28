import { Field, Float, InputType, Int, PartialType } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  DistrictType,
  QualificationLevel,
  SocialCategory,
} from '../../../enums/student.enums';

@InputType()
export class CreateStudentInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skills: string[];

  @Field(() => QualificationLevel)
  @IsEnum(QualificationLevel)
  qualification: QualificationLevel;

  @Field()
  @IsString()
  fieldOfStudy: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(10)
  cgpa: number;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  locationPreference: string[];

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sectorInterests: string[];

  @Field(() => SocialCategory, { defaultValue: SocialCategory.GENERAL })
  @IsEnum(SocialCategory)
  socialCategory: SocialCategory;

  @Field(() => DistrictType, { defaultValue: DistrictType.URBAN })
  @IsEnum(DistrictType)
  districtType: DistrictType;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  pastInternships: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;
}

@InputType()
export class UpdateStudentInput extends PartialType(CreateStudentInput) {}
