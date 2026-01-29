// src/modules/auth/auth.resolver.ts
import { Resolver, Args, Mutation, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth-response.dto';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { User } from '../users/entities/user.entity';

@Resolver('Auth')
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput) {
    return this.authService.login(loginInput);
  }

  @Mutation(() => AuthResponse)
  async register(@Args('registerInput') registerInput: RegisterInput) {
    return this.authService.register(registerInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async logout(@Context() context) {
    // Implement token blacklisting or other logout logic
    return true;
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: User) {
    return user;
  }
}