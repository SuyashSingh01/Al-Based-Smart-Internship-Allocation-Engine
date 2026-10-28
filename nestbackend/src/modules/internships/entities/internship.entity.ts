import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QualificationLevel } from '../../../enums/student.enums';
import { Company } from '../../companies/entities/company.entity';
import { Application } from '../../applications/entities/application.entity';

@ObjectType()
@Entity('internships')
@Index(['sector'])
@Index(['location'])
@Index(['isActive'])
export class Internship {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company, (company) => company.internships, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Field({ nullable: true })
  @Column({ nullable: true })
  companyId?: string;

  @Field()
  @Column()
  companyName: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => [String])
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  requiredSkills: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  preferredSkills?: string[];

  @Field(() => QualificationLevel)
  @Column({ type: 'enum', enum: QualificationLevel })
  preferredQualification: QualificationLevel;

  @Field()
  @Column()
  sector: string;

  @Field()
  @Column()
  location: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  stipend?: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  durationMonths: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  filledPositions: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  minCgpa: number;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  preferredFields?: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  requiredLanguages?: string[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => [Application], { nullable: true })
  @OneToMany(() => Application, (application) => application.internship)
  applications?: Application[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
