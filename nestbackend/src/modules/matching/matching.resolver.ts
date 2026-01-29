import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MatchingService } from './matching.service';
import { MatchRequestInput, SingleMatchInput } from './dto/match-request.input';
import { MatchResult } from './entities/match.entity';

@Resolver()
export class MatchingResolver {
  constructor(private readonly matchingService: MatchingService) {}

  @Mutation(() => [MatchResult])
  async batchMatch(
    @Args('input') input: MatchRequestInput,
    @Args('students', { type: () => [Object] }) students: any[],
    @Args('internships', { type: () => [Object] }) internships: any[],
  ) {
    const result = await this.matchingService.batchMatch(input, students, internships);
    return result.results;
  }

  @Query(() => MatchResult)
  async singleMatch(
    @Args('input') input: SingleMatchInput,
    @Args('student', { type: () => Object }) student: any,
    @Args('internships', { type: () => [Object] }) internships: any[],
  ) {
    return this.matchingService.singleMatch(input, student, internships);
  }

  @Query(() => Boolean)
  async checkMLServiceHealth() {
    return this.matchingService.checkMLServiceHealth();
  }
}
