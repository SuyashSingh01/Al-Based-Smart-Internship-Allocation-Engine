import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { QualificationLevel } from '../../students/entities/student.entity';

@ObjectType()
export class Internship {
  @Field(() => String)
  id: string;

  @Field()
  companyName: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => [String])
  requiredSkills: string[];

  @Field(() => QualificationLevel)
  preferredQualification: QualificationLevel;

  @Field()
  sector: string;

  @Field()
  location: string;

  @Field(() => Float, { nullable: true })
  stipend?: number;

  @Field(() => Int)
  durationMonths: number;

  @Field(() => Int)
  capacity: number;

  @Field(() => Int)
  filledPositions: number;

  @Field(() => Float)
  minCgpa: number;

  @Field(() => [String], { nullable: true })
  preferredFields?: string[];

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
