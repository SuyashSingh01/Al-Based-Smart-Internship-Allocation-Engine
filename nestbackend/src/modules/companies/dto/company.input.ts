import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUrl } from 'class-validator';

@InputType()
export class CreateCompanyInput {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sector?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  headquartersLocation?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}

@InputType()
export class UpdateCompanyInput extends PartialType(CreateCompanyInput) {}
