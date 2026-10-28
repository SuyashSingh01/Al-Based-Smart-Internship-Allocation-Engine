import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
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
import { Student } from '../../students/entities/student.entity';
import { Internship } from '../../internships/entities/internship.entity';
import { MatchScore } from '../../matching/entities/match.entity';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

registerEnumType(ApplicationStatus, { name: 'ApplicationStatus' });

@ObjectType()
@Entity('applications')
@Index(['studentId', 'internshipId'], { unique: true })
@Index(['status'])
export class Application {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => Student, { nullable: true })
  @ManyToOne(() => Student, (student) => student.applications, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'studentId' })
  student?: Student;

  @Field()
  @Column()
  studentId!: string;

  @Field(() => Internship, { nullable: true })
  @ManyToOne(() => Internship, (internship) => internship.applications, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'internshipId' })
  internship?: Internship;

  @Field()
  @Column()
  internshipId!: string;

  @Field(() => ApplicationStatus)
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status!: ApplicationStatus;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  coverLetter?: string;

  @Field(() => MatchScore, { nullable: true })
  @OneToOne(() => MatchScore, (score) => score.application, { nullable: true })
  matchScore?: MatchScore;

  @Field()
  @CreateDateColumn()
  appliedAt!: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
