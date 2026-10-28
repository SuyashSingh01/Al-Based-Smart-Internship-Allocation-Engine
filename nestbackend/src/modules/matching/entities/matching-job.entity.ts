import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { JSONScalar } from '../../../common/scalars/json.scalar';

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

registerEnumType(JobStatus, { name: 'JobStatus' });

/**
 * Durable record of an async matching run. BullMQ owns *execution* (retries,
 * concurrency); this row owns *state* that clients query and that outlives
 * BullMQ's own job retention.
 */
@ObjectType()
@Entity('matching_jobs')
@Index(['status'])
export class MatchingJob {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  type: string; // 'BATCH'

  @Field(() => JobStatus)
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status: JobStatus;

  /** The request as submitted (student ids, options). */
  @Field(() => JSONScalar, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  /** Summary written on completion: counts, per-student match totals, failures. */
  @Field(() => JSONScalar, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  result?: Record<string, unknown>;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  totalStudents: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  processedStudents: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  failedStudents: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  error?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  correlationId?: string;

  /** User id of the admin who started the run. */
  @Field({ nullable: true })
  @Column({ nullable: true })
  requestedBy?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
