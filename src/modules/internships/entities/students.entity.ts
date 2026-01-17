import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Student {
  @Field(() => Int)
  id: number;

  @Field()
  Studentname: string;

  @Field()
  Studentemail: string;
}
