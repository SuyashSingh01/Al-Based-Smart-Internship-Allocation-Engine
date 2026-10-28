import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Application } from '../../applications/entities/application.entity';
import { DistrictType, QualificationLevel, SocialCategory } from '../../../enums/student.enums';

// Re-exported for existing imports; the definitions live in enums/student.enums.ts.
export { DistrictType, QualificationLevel, SocialCategory };

@ObjectType()
@Entity('students')
export class Student {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => User, { nullable: true })
  @OneToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Field({ nullable: true })
  @Index({ unique: true })
  @Column({ nullable: true })
  userId?: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Field(() => [String])
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  skills: string[];

  @Field(() => QualificationLevel)
  @Column({ type: 'enum', enum: QualificationLevel })
  qualification: QualificationLevel;

  @Field()
  @Column()
  fieldOfStudy: string;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  cgpa: number;

  @Field(() => [String])
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  locationPreference: string[];

  @Field(() => [String])
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  sectorInterests: string[];

  @Field(() => SocialCategory)
  @Column({ type: 'enum', enum: SocialCategory, default: SocialCategory.GENERAL })
  socialCategory: SocialCategory;

  @Field(() => DistrictType)
  @Column({ type: 'enum', enum: DistrictType, default: DistrictType.URBAN })
  districtType: DistrictType;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  pastInternships: number;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  languages?: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  certifications?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  resumeUrl?: string;

  @Field(() => [Application], { nullable: true })
  @OneToMany(() => Application, (application) => application.student)
  applications?: Application[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
