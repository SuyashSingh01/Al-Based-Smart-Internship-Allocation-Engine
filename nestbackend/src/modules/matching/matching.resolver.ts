import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MatchingService } from './matching.service';
import { MatchRequestInput, SingleMatchInput } from './dto/match-request.input';
import { MatchResult, MatchScore } from './entities/match.entity';
import { MatchingJob } from './entities/matching-job.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/principal';
import { UserRole } from '../../enums/auth/user-role';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class MatchingResolver {
  constructor(private readonly matchingService: MatchingService) {}

  /** Enqueue an async batch run. Returns the PENDING job immediately. */
  @Mutation(() => MatchingJob)
  @Roles(UserRole.ADMIN)
  startBatchMatch(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: MatchRequestInput,
  ): Promise<MatchingJob> {
    return this.matchingService.startBatchMatch(user, input);
  }

  @Query(() => MatchingJob)
  @Roles(UserRole.ADMIN)
  matchingJobStatus(@Args('jobId', { type: () => ID }) jobId: string): Promise<MatchingJob> {
    return this.matchingService.getJobStatus(jobId);
  }

  @Query(() => [MatchingJob])
  @Roles(UserRole.ADMIN)
  matchingJobs(
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 }) take: number,
  ): Promise<MatchingJob[]> {
    return this.matchingService.listJobs(take);
  }

  /** Synchronously rank one student (students: themselves). Persists the scores. */
  @Mutation(() => MatchResult)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  runSingleMatch(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: SingleMatchInput,
  ): Promise<MatchResult> {
    return this.matchingService.runSingleMatch(user, input);
  }

  @Query(() => [MatchScore])
  @Roles(UserRole.STUDENT)
  myMatches(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 }) take: number,
  ): Promise<MatchScore[]> {
    return this.matchingService.myMatches(user, take);
  }

  @Query(() => [MatchScore])
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  topMatchesForStudent(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('studentId', { type: () => ID }) studentId: string,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 }) take: number,
  ): Promise<MatchScore[]> {
    return this.matchingService.topMatchesForStudent(user, studentId, take);
  }

  @Query(() => Boolean)
  @Roles(UserRole.ADMIN)
  checkMLServiceHealth(): Promise<boolean> {
    return this.matchingService.checkMLServiceHealth();
  }
}
