import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from './modules/auth/auth.guard';

@Resolver()
export class SomeProtectedResolver {
  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  protectedRoute() {
    return 'You have access!';
  }
}
