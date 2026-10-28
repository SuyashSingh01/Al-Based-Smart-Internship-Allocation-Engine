import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Internship } from '../../internships/entities/internship.entity';

@ObjectType()
@Entity('companies')
export class Company {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field()
  @Column()
  name!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  sector?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  headquartersLocation?: string;

  @Field(() => User, { nullable: true })
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerUserId' })
  ownerUser?: User;

  @Field({ nullable: true })
  @Column({ nullable: true })
  ownerUserId?: string;

  @Field(() => [Internship], { nullable: true })
  @OneToMany(() => Internship, (internship) => internship.company)
  internships?: Internship[];

  @Field()
  @Column({ default: true })
  isVerified!: boolean;

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
