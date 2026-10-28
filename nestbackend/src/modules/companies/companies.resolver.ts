import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/principal';
import { UserRole } from '../../enums/auth/user-role';
import { Company } from './entities/company.entity';
import { CompaniesService } from './companies.service';
import { CreateCompanyInput, UpdateCompanyInput } from './dto/company.input';

@Resolver(() => Company)
export class CompaniesResolver {
  constructor(private readonly companiesService: CompaniesService) {}

  // Public: company directory is browsable without login.
  @Query(() => [Company])
  companies(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 }) take: number,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<Company[]> {
    return this.companiesService.findAll(skip, take, search);
  }

  @Query(() => Company)
  company(@Args('id', { type: () => ID }) id: string): Promise<Company> {
    return this.companiesService.findOne(id);
  }

  @Query(() => Company, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  myCompany(@CurrentUser() user: AuthenticatedPrincipal): Promise<Company | null> {
    return this.companiesService.findByOwnerUserId(user.id);
  }

  @Mutation(() => Company)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  createCompany(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: CreateCompanyInput,
  ): Promise<Company> {
    return this.companiesService.create(user, input);
  }

  @Mutation(() => Company)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  updateCompany(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCompanyInput,
  ): Promise<Company> {
    return this.companiesService.update(user, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeCompany(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.companiesService.remove(id);
  }
}
