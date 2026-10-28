import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class TokenPairDto {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field(() => Int)
  accessTokenExpiresIn: number;

  @Field(() => Int)
  refreshTokenExpiresIn: number;

  @Field()
  tokenType: string;
}

@ObjectType()
export class AuthResponse {
  @Field(() => User)
  user: User;

  @Field(() => TokenPairDto)
  tokens: TokenPairDto;
}
