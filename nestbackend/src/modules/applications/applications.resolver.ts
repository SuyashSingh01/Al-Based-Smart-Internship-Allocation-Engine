import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/principal';
import { UserRole } from '../../enums/auth/user-role';
import { Application } from './entities/application.entity';
import { ApplicationsService } from './applications.service';
import { CreateApplicationInput, UpdateApplicationStatusInput } from './dto/application.input';

@Resolver(() => Application)
@UseGuards(GqlAuthGuard, RolesGuard)
export class ApplicationsResolver {
  constructor(private readonly service: ApplicationsService) {}

  @Query(() => [Application])
  @Roles(UserRole.ADMIN)
  applications(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 100 }) take: number,
  ): Promise<Application[]> {
    return this.service.findAll(skip, take);
  }

  @Query(() => [Application])
  @Roles(UserRole.STUDENT)
  myApplications(@CurrentUser() user: AuthenticatedPrincipal): Promise<Application[]> {
    return this.service.findMine(user);
  }

  @Query(() => [Application])
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  applicationsByStudent(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('studentId', { type: () => ID }) studentId: string,
  ): Promise<Application[]> {
    return this.service.findByStudent(user, studentId);
  }

  @Query(() => [Application])
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  applicationsByInternship(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('internshipId', { type: () => ID }) internshipId: string,
  ): Promise<Application[]> {
    return this.service.findByInternship(user, internshipId);
  }

  @Query(() => Application)
  application(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Application> {
    return this.service.findOneFor(user, id);
  }

  @Mutation(() => Application)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  createApplication(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: CreateApplicationInput,
  ): Promise<Application> {
    return this.service.create(user, input);
  }

  @Mutation(() => Application)
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  updateApplicationStatus(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateApplicationStatusInput,
  ): Promise<Application> {
    return this.service.updateStatus(user, id, input);
  }

  @Mutation(() => Application)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  withdrawApplication(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Application> {
    return this.service.withdraw(user, id);
  }

  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  removeApplication(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.service.remove(id);
  }
}
