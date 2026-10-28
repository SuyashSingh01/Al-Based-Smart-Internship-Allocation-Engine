import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';

import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { KeystoreService } from './services/keystore.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { OAuthService } from './services/oauth.service';
import { ClientCredentialsService } from './services/client-credentials.service';
import { IntrospectionService } from './services/introspection.service';

import { AuthResolver } from './auth.resolver';
import { JwksController } from './controllers/jwks.controller';
import { OAuthController } from './controllers/oauth.controller';
import { TokenController } from './controllers/token.controller';

import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MetaStrategy } from './strategies/meta.strategy';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { ScopesGuard } from './guards/scopes.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
  ],
  providers: [
    KeystoreService,
    TokenService,
    RefreshTokenService,
    OAuthService,
    ClientCredentialsService,
    IntrospectionService,
    AuthService,
    AuthResolver,
    JwtStrategy,
    GoogleStrategy,
    MetaStrategy,
    GqlAuthGuard,
    ScopesGuard,
  ],
  controllers: [JwksController, OAuthController, TokenController],
  exports: [
    TokenService,
    KeystoreService,
    AuthService,
    JwtStrategy,
    PassportModule,
    ScopesGuard,
  ],
})
export class AuthModule {}
