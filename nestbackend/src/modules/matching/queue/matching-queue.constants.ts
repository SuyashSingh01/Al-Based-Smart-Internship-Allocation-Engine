import { MatchRequestInput } from '../dto/match-request.input';

export const MATCHING_QUEUE = 'matching';
export const BATCH_MATCH_JOB = 'batch-match';

/**
 * What goes into Redis for one batch job. Only ids and options — the worker
 * loads fresh rows from Postgres when it runs. Snapshotting whole entities
 * here would bloat Redis and match against stale data after a retry/delay.
 */
export interface BatchMatchJobData {
  jobId: string;
  studentIds: string[];
  /** null = use the live eligible pool at execution time. */
  internshipIds: string[] | null;
  options: Pick<MatchRequestInput, 'diversityBoost' | 'maxMatchesPerStudent' | 'minScoreThreshold'>;
  correlationId: string;
}
