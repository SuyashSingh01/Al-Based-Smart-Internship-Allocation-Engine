import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

registerEnumType(ApplicationStatus, { name: 'ApplicationStatus' });

@ObjectType()
export class Application {
  @Field(() => String)
  id: string;

  @Field()
  studentId: string;

  @Field()
  internshipId: string;

  @Field(() => ApplicationStatus)
  status: ApplicationStatus;

  @Field({ nullable: true })
  coverLetter?: string;

  @Field()
  appliedAt: Date;

  @Field({ nullable: true })
  respondedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
