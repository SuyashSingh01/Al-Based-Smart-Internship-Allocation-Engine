import { UseGuards } from '@nestjs/common';
import { Field, Float, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../enums/auth/user-role';
import { StatsService } from './stats.service';

@ObjectType()
export class CountByKey {
  @Field()
  key: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class PlatformStats {
  @Field(() => Int) users: number;
  @Field(() => Int) students: number;
  @Field(() => Int) companies: number;
  @Field(() => Int) internships: number;
  @Field(() => Int) activeInternships: number;
  @Field(() => Int) totalSeats: number;
  @Field(() => Int) filledSeats: number;
  @Field(() => Int) applications: number;
  @Field(() => [CountByKey]) applicationsByStatus: CountByKey[];
  @Field(() => Int) matchScores: number;
  @Field(() => Float, { nullable: true }) avgMatchScore?: number;
  /** Students from SC/ST/OBC categories or rural/aspirational districts with ≥1 match. */
  @Field(() => Int) underrepresentedStudentsMatched: number;
  @Field(() => [CountByKey]) internshipsBySector: CountByKey[];
}

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class StatsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => PlatformStats)
  @Roles(UserRole.ADMIN)
  platformStats(): Promise<PlatformStats> {
    return this.stats.platformStats();
  }
}
