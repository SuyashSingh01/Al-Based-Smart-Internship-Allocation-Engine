import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { In, IsNull, Not, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { StudentsService } from '../students/students.service';
import { InternshipsService } from '../internships/internships.service';
import { Student } from '../students/entities/student.entity';
import { Internship } from '../internships/entities/internship.entity';
import { MatchingJob, JobStatus } from './entities/matching-job.entity';
import { MatchResult, MatchScore } from './entities/match.entity';
import { MatchRequestInput, MAX_BATCH_STUDENTS, SingleMatchInput } from './dto/match-request.input';
import { BATCH_MATCH_JOB, BatchMatchJobData, MATCHING_QUEUE } from './queue/matching-queue.constants';
import { MlClientService, MlMatchResult } from './ml-client.service';
import { AuthenticatedPrincipal, isStudent } from '../../common/auth/principal';

/** Per-student outcome of a batch run, kept in MatchingJob.result. */
export type BatchStudentOutcome = {
  studentId: string;
  matches: number;
  topInternshipId?: string;
  topScore?: number;
  error?: string;
};

export type BatchRunSummary = {
  totalStudentsProcessed: number;
  totalMatchesGenerated: number;
  failedStudents: number;
  internshipPoolSize: number;
  outcomes: BatchStudentOutcome[];
};

/** How many students are ranked against the ML service in parallel per job. */
const RANK_CONCURRENCY = 4;

/**
 * Orchestrates matching: decides *who* is ranked against *what*, calls the ML
 * service via MlClientService, and persists scores. It never does ML itself.
 *
 * Two paths:
 *  - Batch (admin): `startBatchMatch` persists a MatchingJob and enqueues a
 *    BullMQ job (202-style: returns immediately). MatchingProcessor executes it.
 *  - Single (student/admin): `runSingleMatch` ranks one student synchronously
 *    (~1 ML call) and returns the persisted scores.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly studentsService: StudentsService,
    private readonly internshipsService: InternshipsService,
    private readonly ml: MlClientService,
    @InjectRepository(MatchingJob) private readonly jobRepository: Repository<MatchingJob>,
    @InjectRepository(MatchScore) private readonly matchScoreRepo: Repository<MatchScore>,
    @InjectQueue(MATCHING_QUEUE) private readonly matchingQueue: Queue<BatchMatchJobData>,
  ) {}

  // ------------------------------------------------------------------
  // Batch (async)
  // ------------------------------------------------------------------

  /**
   * Validate the request, persist a PENDING job row and enqueue it.
   * Returns immediately; progress arrives via WebSocket or `matchingJobStatus`.
   */
  async startBatchMatch(principal: AuthenticatedPrincipal, input: MatchRequestInput): Promise<MatchingJob> {
    const correlationId = randomUUID();

    const studentIds = input.studentIds?.length
      ? (await this.studentsService.findByIds(input.studentIds)).map((s) => s.id)
      : await this.studentsService.findAllIds(MAX_BATCH_STUDENTS);
    if (!studentIds.length) throw new BadRequestException('No valid students to match');

    const poolSize = (await this.loadInternshipPool(input.internshipIds)).length;
    if (!poolSize) throw new BadRequestException('No eligible internships available');

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        type: 'BATCH',
        status: JobStatus.PENDING,
        payload: {
          studentIds,
          internshipIds: input.internshipIds ?? null,
          diversityBoost: input.diversityBoost,
          maxMatchesPerStudent: input.maxMatchesPerStudent,
          minScoreThreshold: input.minScoreThreshold,
        },
        totalStudents: studentIds.length,
        correlationId,
        requestedBy: principal.id,
      }),
    );

    // BullMQ jobId = our row id → enqueueing the same job twice is a no-op.
    await this.matchingQueue.add(
      BATCH_MATCH_JOB,
      {
        jobId: job.id,
        studentIds,
        internshipIds: input.internshipIds?.length ? input.internshipIds : null,
        options: {
          diversityBoost: input.diversityBoost,
          maxMatchesPerStudent: input.maxMatchesPerStudent,
          minScoreThreshold: input.minScoreThreshold,
        },
        correlationId,
      },
      { jobId: job.id },
    );

    this.logger.log(`[${correlationId}] Enqueued batch job ${job.id} (${studentIds.length} students, pool ${poolSize})`);
    return job;
  }

  /**
   * Executed by MatchingProcessor. Ranks each student with bounded
   * concurrency. One student failing (e.g. a bad profile) does not fail the
   * whole batch; it is recorded in the outcome. If *every* student fails
   * (ML down), it throws so BullMQ retries the job with backoff.
   */
  async runBatchMatchJob(
    data: BatchMatchJobData,
    onStudentDone?: (processed: number, failed: number) => Promise<void>,
  ): Promise<BatchRunSummary> {
    const students = await this.studentsService.findByIds(data.studentIds);
    const internships = await this.loadInternshipPool(data.internshipIds);
    if (!internships.length) throw new Error('No eligible internships available at execution time');

    const outcomes: BatchStudentOutcome[] = [];
    let processed = 0;
    let failed = 0;

    await runWithConcurrency(students, RANK_CONCURRENCY, async (student) => {
      try {
        const result = await this.ml.rank(student, internships, {
          maxMatches: data.options.maxMatchesPerStudent,
          minScore: data.options.minScoreThreshold,
          diversityBoost: data.options.diversityBoost,
          correlationId: data.correlationId,
        });
        await this.persistMatches(result, { prune: data.internshipIds === null });
        const top = result.matches[0];
        outcomes.push({
          studentId: student.id,
          matches: result.total_matches,
          topInternshipId: top?.internship_id,
          topScore: top?.overall_score,
        });
      } catch (err) {
        failed++;
        outcomes.push({ studentId: student.id, matches: 0, error: (err as Error).message });
        this.logger.warn(`[${data.correlationId}] Student ${student.id} failed: ${(err as Error).message}`);
      }
      processed++;
      await onStudentDone?.(processed, failed);
    });

    if (students.length > 0 && failed === students.length) {
      throw new Error(`All ${failed} students failed to rank; first error: ${outcomes[0]?.error}`);
    }

    return {
      totalStudentsProcessed: students.length,
      totalMatchesGenerated: outcomes.reduce((acc, o) => acc + o.matches, 0),
      failedStudents: failed,
      internshipPoolSize: internships.length,
      outcomes,
    };
  }

  async getJobStatus(jobId: string): Promise<MatchingJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  listJobs(take = 20): Promise<MatchingJob[]> {
    return this.jobRepository.find({ order: { createdAt: 'DESC' }, take: Math.min(take, 100) });
  }

  // ------------------------------------------------------------------
  // Single student (sync)
  // ------------------------------------------------------------------

  /** Rank one student now. Students always rank themselves. */
  async runSingleMatch(principal: AuthenticatedPrincipal, input: SingleMatchInput): Promise<MatchResult> {
    let student: Student;
    if (isStudent(principal)) {
      student = await this.studentsService.requireOwnProfile(principal);
    } else if (input.studentId) {
      student = await this.studentsService.findOne(input.studentId);
    } else {
      throw new BadRequestException('studentId is required');
    }

    const internships = await this.loadInternshipPool(input.internshipIds);
    if (!internships.length) throw new BadRequestException('No eligible internships available');

    const ml = await this.ml.rank(student, internships, {
      maxMatches: input.maxMatches,
      minScore: 0,
      diversityBoost: true,
    });
    await this.persistMatches(ml, { prune: !input.internshipIds?.length });

    // Return the persisted rows (real ids + internship details), in ML rank order.
    const rows = await this.matchScoreRepo.find({
      where: { studentId: student.id, internshipId: In(ml.matches.map((m) => m.internship_id)) },
      relations: ['internship'],
    });
    const order = new Map(ml.matches.map((m, i) => [m.internship_id, i]));
    rows.sort((a, b) => (order.get(a.internshipId) ?? 0) - (order.get(b.internshipId) ?? 0));

    return { studentId: student.id, studentName: student.name, matches: rows, totalMatches: rows.length };
  }

  // ------------------------------------------------------------------
  // Reads
  // ------------------------------------------------------------------

  async topMatchesForStudent(
    principal: AuthenticatedPrincipal,
    studentId: string,
    take = 20,
  ): Promise<MatchScore[]> {
    if (isStudent(principal)) {
      const own = await this.studentsService.requireOwnProfile(principal);
      if (own.id !== studentId) throw new BadRequestException('Use myMatches to view your own matches');
    }
    return this.matchScoreRepo.find({
      where: { studentId },
      relations: ['internship'],
      order: { overallScore: 'DESC' },
      take: Math.min(take, 100),
    });
  }

  async myMatches(principal: AuthenticatedPrincipal, take = 20): Promise<MatchScore[]> {
    const own = await this.studentsService.requireOwnProfile(principal);
    return this.topMatchesForStudent(principal, own.id, take);
  }

  checkMLServiceHealth(): Promise<boolean> {
    return this.ml.isHealthy();
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private loadInternshipPool(ids?: string[] | null): Promise<Internship[]> {
    return ids?.length
      ? this.internshipsService.findByIds(ids)
      : this.internshipsService.findEligibleForMatching();
  }

  /**
   * Upsert scores on the unique (studentId, internshipId) key so re-runs
   * update rows in place (keeping any linked applicationId).
   *
   * With `prune`, the run used the full eligible pool, so this result *is*
   * the student's current recommendation list: scores for internships that
   * dropped out (filled up, closed) are removed — unless an application
   * references them.
   */
  private async persistMatches(result: MlMatchResult, opts: { prune: boolean }): Promise<void> {
    const studentId = result.student_id;
    const keepIds = result.matches.map((m) => m.internship_id);

    if (opts.prune) {
      await this.matchScoreRepo.delete({
        studentId,
        applicationId: IsNull(),
        ...(keepIds.length ? { internshipId: Not(In(keepIds)) } : {}),
      });
    }
    if (!result.matches.length) return;

    const rows = result.matches.map((m) => ({
      studentId,
      internshipId: m.internship_id,
      overallScore: m.overall_score,
      skillScore: m.skill_score,
      qualificationScore: m.qualification_score,
      locationScore: m.location_score,
      sectorScore: m.sector_score,
      diversityScore: m.diversity_score,
      fieldScore: m.field_score,
      certificationScore: m.certification_score,
      languageScore: m.language_score,
      rankerScore: m.ranker_score ?? undefined,
      eligible: m.eligible ?? true,
      explanation: m.explanation
        ? {
            skills: m.explanation.skills,
            qualification: m.explanation.qualification,
            location: m.explanation.location,
            sector: m.explanation.sector,
            field: m.explanation.field,
            certifications: m.explanation.certifications,
            languages: m.explanation.languages,
            diversity: m.explanation.diversity,
            weightedScore: m.explanation.weighted_score,
            ranker: m.explanation.ranker,
          }
        : undefined,
    }));
    await this.matchScoreRepo.upsert(rows, ['studentId', 'internshipId']);
  }
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}
