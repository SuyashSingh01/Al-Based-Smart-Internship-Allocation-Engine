import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class MatchScore {
  @Field()
  studentId: string;

  @Field()
  internshipId: string;

  @Field(() => Float)
  overallScore: number;

  @Field(() => Float)
  skillScore: number;

  @Field(() => Float)
  qualificationScore: number;

  @Field(() => Float)
  locationScore: number;

  @Field(() => Float)
  sectorScore: number;

  @Field(() => Float)
  diversityScore: number;

  @Field(() => MatchExplanation)
  explanation: MatchExplanation;
}

@ObjectType()
export class MatchExplanation {
  @Field()
  skills: string;

  @Field()
  qualification: string;

  @Field()
  location: string;

  @Field()
  sector: string;

  @Field()
  diversity: string;
}

@ObjectType()
export class MatchResult {
  @Field()
  studentId: string;

  @Field()
  studentName: string;

  @Field(() => [MatchScore])
  matches: MatchScore[];

  @Field(() => Float)
  totalMatches: number;
}
