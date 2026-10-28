import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';
import { Internship } from '../../internships/entities/internship.entity';
import { Student } from '../../students/entities/student.entity';

@ObjectType()
export class MatchExplanation {
  @Field({ nullable: true })
  skills?: string;

  @Field({ nullable: true })
  qualification?: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  sector?: string;

  @Field({ nullable: true })
  field?: string;

  @Field({ nullable: true })
  certifications?: string;

  @Field({ nullable: true })
  languages?: string;

  @Field({ nullable: true })
  diversity?: string;

  @Field({ nullable: true })
  weightedScore?: string;

  @Field({ nullable: true })
  ranker?: string;
}

/**
 * Latest ML score for one (student, internship) pair. Unique per pair: re-runs
 * upsert in place, so a linked application keeps its score.
 */
@ObjectType()
@Entity('match_scores')
@Index(['studentId', 'internshipId'], { unique: true })
@Index(['studentId', 'overallScore'])
export class MatchScore {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  studentId: string;

  @Field(() => Student, { nullable: true })
  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student?: Student;

  @Field()
  @Column()
  internshipId: string;

  @Field(() => Internship, { nullable: true })
  @ManyToOne(() => Internship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internshipId' })
  internship?: Internship;

  @Field(() => Application, { nullable: true })
  @OneToOne(() => Application, (application) => application.matchScore, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'applicationId' })
  application?: Application;

  @Field({ nullable: true })
  @Column({ nullable: true })
  applicationId?: string;

  @Field(() => Float)
  @Column({ type: 'float' })
  overallScore: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  skillScore: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  qualificationScore: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  locationScore: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  sectorScore: number;

  @Field(() => Float)
  @Column({ type: 'float', default: 0 })
  diversityScore: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  fieldScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  certificationScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  languageScore?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  rankerScore?: number;

  @Field({ nullable: true })
  @Column({ default: true })
  eligible: boolean;

  @Field(() => MatchExplanation, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  explanation?: MatchExplanation;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@ObjectType()
export class MatchResult {
  @Field()
  studentId: string;

  @Field()
  studentName: string;

  @Field(() => [MatchScore])
  matches: MatchScore[];

  @Field(() => Int)
  totalMatches: number;
}
