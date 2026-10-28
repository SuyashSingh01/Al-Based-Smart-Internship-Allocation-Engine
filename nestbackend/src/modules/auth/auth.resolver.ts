import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from './auth.constants';

import { AuthService } from './services/auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { User } from '../users/entities/user.entity';
import { AuthenticatedPrincipal } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

@Resolver('Auth')
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => AuthResponse)
  @Throttle(CREDENTIAL_THROTTLE)
  register(@Args('registerInput') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input) as unknown as Promise<AuthResponse>;
  }

  @Mutation(() => AuthResponse)
  @Throttle(CREDENTIAL_THROTTLE)
  login(@Args('loginInput') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input) as unknown as Promise<AuthResponse>;
  }

  @Mutation(() => AuthResponse)
  refreshTokens(@Args('refreshToken') refreshToken: string): Promise<AuthResponse> {
    return this.authService.refresh(refreshToken) as unknown as Promise<AuthResponse>;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async logout(@CurrentUser() principal: AuthenticatedPrincipal): Promise<boolean> {
    await this.authService.logout(principal.id);
    return true;
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() principal: AuthenticatedPrincipal): Promise<User> {
    const user = await this.usersService.findById(principal.id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
