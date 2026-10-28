import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/principal';
import { UserRole } from '../../enums/auth/user-role';
import { Internship } from './entities/internship.entity';
import { InternshipsService } from './internships.service';
import { CreateInternshipInput, UpdateInternshipInput } from './dto/internship.input';

@Resolver(() => Internship)
export class InternshipsResolver {
  constructor(private readonly internshipsService: InternshipsService) {}

  // Public: anyone can browse open internships.
  @Query(() => [Internship])
  internships(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 }) take: number,
    @Args('search', { nullable: true }) search?: string,
    @Args('sector', { nullable: true }) sector?: string,
    @Args('location', { nullable: true }) location?: string,
    @Args('companyId', { type: () => ID, nullable: true }) companyId?: string,
    @Args('onlyActive', { nullable: true, defaultValue: true }) onlyActive?: boolean,
    @Args('onlyWithCapacity', { nullable: true, defaultValue: false }) onlyWithCapacity?: boolean,
  ): Promise<Internship[]> {
    return this.internshipsService.findAll({
      skip,
      take: Math.min(take, 200),
      search,
      sector,
      location,
      companyId,
      onlyActive,
      onlyWithCapacity,
    });
  }

  @Query(() => Internship)
  internship(@Args('id', { type: () => ID }) id: string): Promise<Internship> {
    return this.internshipsService.findOne(id);
  }

  @Mutation(() => Internship)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  createInternship(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: CreateInternshipInput,
  ): Promise<Internship> {
    return this.internshipsService.create(user, input);
  }

  @Mutation(() => Internship)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  updateInternship(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateInternshipInput,
  ): Promise<Internship> {
    return this.internshipsService.update(user, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  removeInternship(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.internshipsService.remove(user, id);
  }
}
