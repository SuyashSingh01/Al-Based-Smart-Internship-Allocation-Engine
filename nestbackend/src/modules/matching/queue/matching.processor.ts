import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { BatchMatchJobData, MATCHING_QUEUE } from './matching-queue.constants';
import { JobStatus, MatchingJob } from '../entities/matching-job.entity';
import { BatchRunSummary, MatchingService } from '../matching.service';
import { MatchingGateway } from '../matching.gateway';

/**
 * BullMQ worker for batch matching. Any API replica can run it; Redis hands
 * each job to exactly one worker. Lifecycle (persisted + pushed over WS):
 *
 *   PENDING → PROCESSING → (progress …) → COMPLETED
 *                        ↘ attempt failed → PENDING (retrying) → …
 *                        ↘ final attempt failed → FAILED
 */
@Processor(MATCHING_QUEUE, { concurrency: 2 })
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    @InjectRepository(MatchingJob)
    private readonly jobRepository: Repository<MatchingJob>,
    private readonly matchingService: MatchingService,
    private readonly gateway: MatchingGateway,
  ) {
    super();
  }

  async process(job: Job<BatchMatchJobData>): Promise<BatchRunSummary> {
    const { jobId, correlationId, studentIds } = job.data;
    this.logger.log(
      `[${correlationId}] Processing job ${jobId} attempt ${job.attemptsMade + 1} (${studentIds.length} students)`,
    );

    await this.jobRepository.update(jobId, {
      status: JobStatus.PROCESSING,
      processedStudents: 0,
      failedStudents: 0,
      error: null as unknown as string,
    });
    this.gateway.emitJobUpdate(jobId, { status: JobStatus.PROCESSING, processed: 0, total: studentIds.length });

    const summary = await this.matchingService.runBatchMatchJob(job.data, async (processed, failed) => {
      await this.jobRepository.update(jobId, { processedStudents: processed, failedStudents: failed });
      await job.updateProgress(Math.round((processed / studentIds.length) * 100));
      this.gateway.emitJobUpdate(jobId, {
        status: JobStatus.PROCESSING,
        processed,
        failed,
        total: studentIds.length,
      });
    });

    await this.jobRepository.update(jobId, {
      status: JobStatus.COMPLETED,
      result: summary,
      completedAt: new Date(),
    });
    this.gateway.emitJobUpdate(jobId, {
      status: JobStatus.COMPLETED,
      processed: summary.totalStudentsProcessed,
      failed: summary.failedStudents,
      total: studentIds.length,
      result: {
        totalMatchesGenerated: summary.totalMatchesGenerated,
        failedStudents: summary.failedStudents,
      },
    });
    this.logger.log(
      `[${correlationId}] Job ${jobId} completed: ${summary.totalMatchesGenerated} matches, ${summary.failedStudents} failed students`,
    );
    return summary;
  }

  /**
   * BullMQ fires `failed` after *every* failed attempt. Only the last one is
   * terminal; earlier ones go back to PENDING while the backoff timer runs.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<BatchMatchJobData> | undefined, error: Error): Promise<void> {
    if (!job) return;
    const { jobId, correlationId } = job.data;
    const maxAttempts = job.opts.attempts ?? 1;
    const final = job.attemptsMade >= maxAttempts;

    this.logger.error(
      `[${correlationId}] Job ${jobId} attempt ${job.attemptsMade}/${maxAttempts} failed: ${error.message}` +
        (final ? ' — giving up' : ' — will retry'),
    );
    const status = final ? JobStatus.FAILED : JobStatus.PENDING;
    const message = final ? error.message : `Attempt ${job.attemptsMade} failed (${error.message}); retrying`;
    await this.jobRepository.update(jobId, { status, error: message });
    this.gateway.emitJobUpdate(jobId, { status, error: message });
  }
}
