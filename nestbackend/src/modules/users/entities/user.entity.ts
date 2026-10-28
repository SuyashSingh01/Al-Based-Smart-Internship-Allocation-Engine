import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../enums/auth/user-role';
import { AuthProvider } from '../../auth/enums/auth-provider.enum';

registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
@Entity('users')
@Index('idx_user_provider_identity', ['authProvider', 'providerAccountId'], { unique: true, where: 'provider_account_id IS NOT NULL' })
export class User {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  /**
   * Nullable because OAuth-only and service accounts don't have a password.
   * Never selected by default so it can't leak into responses.
   */
  @Column({ nullable: true, select: false })
  password?: string;

  @Field()
  @Column()
  name: string;

  @Field(() => UserRole, { nullable: true })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT, nullable: true })
  role?: UserRole;

  @Field(() => AuthProvider)
  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider: AuthProvider;

  /**
   * Stable identifier from the third-party provider (Google sub, Facebook id, etc.)
   * or the service account client_id for M2M principals.
   */
  @Field({ nullable: true })
  @Column({ name: 'provider_account_id', nullable: true })
  providerAccountId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatarUrl?: string;

  @Field()
  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, select: false })
  refreshTokenHash?: string;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
