import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../enums/auth/user-role';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/** Account administration. The caller's own account is `me` (AuthResolver). */
@Resolver(() => User)
@UseGuards(GqlAuthGuard, RolesGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  @Roles(UserRole.ADMIN)
  users(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 }) take: number,
    @Args('role', { type: () => UserRole, nullable: true }) role?: UserRole,
  ): Promise<User[]> {
    return this.usersService.findAll({ skip, take, role });
  }
}
