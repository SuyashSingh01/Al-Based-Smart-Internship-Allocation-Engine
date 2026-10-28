import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/principal';
import { UserRole } from '../../enums/auth/user-role';
import { Student } from './entities/student.entity';
import { StudentsService } from './students.service';
import { CreateStudentInput, UpdateStudentInput } from './dto/student.input';

@Resolver(() => Student)
@UseGuards(GqlAuthGuard, RolesGuard)
export class StudentsResolver {
  constructor(private readonly studentsService: StudentsService) {}

  @Query(() => [Student])
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  students(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 }) take: number,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<Student[]> {
    return this.studentsService.findAll({ skip, take, search });
  }

  @Query(() => Student)
  student(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Student> {
    return this.studentsService.findOneFor(user, id);
  }

  @Query(() => Student, { nullable: true })
  myStudentProfile(@CurrentUser() user: AuthenticatedPrincipal): Promise<Student | null> {
    return this.studentsService.findByUserId(user.id);
  }

  @Mutation(() => Student)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  createStudent(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('input') input: CreateStudentInput,
  ): Promise<Student> {
    return this.studentsService.create(user, input);
  }

  @Mutation(() => Student)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  updateStudent(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateStudentInput,
  ): Promise<Student> {
    return this.studentsService.update(user, id, input);
  }

  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  removeStudent(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.studentsService.remove(id);
  }
}
