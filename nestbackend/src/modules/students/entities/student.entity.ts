import { ObjectType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum SocialCategory {
  GENERAL = 'GENERAL',
  OBC = 'OBC',
  SC = 'SC',
  ST = 'ST',
  EWS = 'EWS',
}

export enum DistrictType {
  URBAN = 'URBAN',
  RURAL = 'RURAL',
  ASPIRATIONAL = 'ASPIRATIONAL',
}

export enum QualificationLevel {
  DIPLOMA = 'DIPLOMA',
  UNDERGRADUATE = 'UNDERGRADUATE',
  POSTGRADUATE = 'POSTGRADUATE',
  DOCTORATE = 'DOCTORATE',
}

registerEnumType(SocialCategory, { name: 'SocialCategory' });
registerEnumType(DistrictType, { name: 'DistrictType' });
registerEnumType(QualificationLevel, { name: 'QualificationLevel' });

@ObjectType()
export class Student {
  @Field(() => String)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => [String])
  skills: string[];

  @Field(() => QualificationLevel)
  qualification: QualificationLevel;

  @Field()
  fieldOfStudy: string;

  @Field(() => Float)
  cgpa: number;

  @Field(() => [String])
  locationPreference: string[];

  @Field(() => [String])
  sectorInterests: string[];

  @Field(() => SocialCategory)
  socialCategory: SocialCategory;

  @Field(() => DistrictType)
  districtType: DistrictType;

  @Field(() => Int)
  pastInternships: number;

  @Field(() => [String], { nullable: true })
  languages?: string[];

  @Field(() => [String], { nullable: true })
  certifications?: string[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
