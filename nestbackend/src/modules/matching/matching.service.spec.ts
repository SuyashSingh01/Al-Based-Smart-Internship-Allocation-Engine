import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { MatchingService } from './matching.service';
import { MlClientService, MlMatchResult } from './ml-client.service';
import { MatchingJob } from './entities/matching-job.entity';
import { MatchScore } from './entities/match.entity';
import { StudentsService } from '../students/students.service';
import { InternshipsService } from '../internships/internships.service';
import { BatchMatchJobData } from './queue/matching-queue.constants';
import { adminP, studentP } from '../../common/testing/principals';

const mlResult = (studentId: string, n = 2): MlMatchResult => ({
  student_id: studentId,
  student_name: studentId,
  total_matches: n,
  matches: Array.from({ length: n }, (_, i) => ({
    student_id: studentId,
    internship_id: `i${i}`,
    overall_score: 0.9 - i * 0.1,
    skill_score: 0.8, qualification_score: 0.8, location_score: 1, sector_score: 1, diversity_score: 0.5,
  })),
});

describe('MatchingService', () => {
  const students = { findByIds: jest.fn(), findAllIds: jest.fn(), requireOwnProfile: jest.fn(), findOne: jest.fn() };
  const internships = { findByIds: jest.fn(), findEligibleForMatching: jest.fn() };
  const ml = { rank: jest.fn() };
  const jobs = { create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve({ id: 'job-1', ...x })) };
  const scores = { upsert: jest.fn(), delete: jest.fn(), find: jest.fn().mockResolvedValue([]) };
  const queue = { add: jest.fn() };
  let service: MatchingService;

  const data: BatchMatchJobData = {
    jobId: 'job-1',
    studentIds: ['s1', 's2', 's3'],
    internshipIds: null,
    options: { diversityBoost: true, maxMatchesPerStudent: 5, minScoreThreshold: 0.3 },
    correlationId: 'corr',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    students.findByIds.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }]);
    internships.findEligibleForMatching.mockResolvedValue([{ id: 'i0' }, { id: 'i1' }]);
    service = new MatchingService(
      students as unknown as StudentsService,
      internships as unknown as InternshipsService,
      ml as unknown as MlClientService,
      jobs as unknown as Repository<MatchingJob>,
      scores as unknown as Repository<MatchScore>,
      queue as unknown as Queue<BatchMatchJobData>,
    );
  });

  describe('startBatchMatch', () => {
    it('defaults to all students, persists a PENDING job and enqueues ids only', async () => {
      students.findAllIds.mockResolvedValue(['s1', 's2']);
      const job = await service.startBatchMatch(adminP, {
        diversityBoost: true, maxMatchesPerStudent: 5, minScoreThreshold: 0.3,
      });
      expect(job).toMatchObject({ status: 'PENDING', totalStudents: 2, requestedBy: adminP.id });
      const [, payload, opts] = queue.add.mock.calls[0];
      expect(payload.studentIds).toEqual(['s1', 's2']);
      expect(payload).not.toHaveProperty('students'); // no entity snapshots in Redis
      expect(opts).toEqual({ jobId: 'job-1' }); // idempotent enqueue
    });

    it('refuses to start without eligible internships', async () => {
      students.findAllIds.mockResolvedValue(['s1']);
      internships.findEligibleForMatching.mockResolvedValue([]);
      await expect(
        service.startBatchMatch(adminP, { diversityBoost: true, maxMatchesPerStudent: 5, minScoreThreshold: 0.3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('runBatchMatchJob', () => {
    it('isolates per-student failures and reports progress', async () => {
      ml.rank.mockImplementation(async (s: { id: string }) => {
        if (s.id === 's2') throw new Error('bad profile');
        return mlResult(s.id);
      });
      const progress: Array<[number, number]> = [];
      const summary = await service.runBatchMatchJob(data, async (p, f) => void progress.push([p, f]));

      expect(summary.failedStudents).toBe(1);
      expect(summary.totalMatchesGenerated).toBe(4);
      expect(summary.outcomes.find((o) => o.studentId === 's2')?.error).toBe('bad profile');
      expect(progress.at(-1)).toEqual([3, 1]);
      expect(scores.upsert).toHaveBeenCalledWith(expect.any(Array), ['studentId', 'internshipId']);
    });

    it('throws when every student fails so BullMQ retries the job', async () => {
      ml.rank.mockRejectedValue(new Error('ML down'));
      await expect(service.runBatchMatchJob(data)).rejects.toThrow('All 3 students failed');
    });

    it('passes the min score threshold and correlation id to the ML service', async () => {
      ml.rank.mockImplementation(async (s: { id: string }) => mlResult(s.id));
      await service.runBatchMatchJob(data);
      expect(ml.rank).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        maxMatches: 5, minScore: 0.3, diversityBoost: true, correlationId: 'corr',
      });
    });

    it('prunes stale scores (but keeps ones linked to applications) when using the full pool', async () => {
      ml.rank.mockImplementation(async (s: { id: string }) => mlResult(s.id));
      await service.runBatchMatchJob(data);
      const where = scores.delete.mock.calls[0][0];
      expect(where.studentId).toBe('s1');
      expect(where).toHaveProperty('applicationId');
    });
  });

  it('students always rank themselves in runSingleMatch', async () => {
    students.requireOwnProfile.mockResolvedValue({ id: 'own', name: 'Me' });
    ml.rank.mockResolvedValue(mlResult('own', 1));
    await service.runSingleMatch(studentP, { studentId: 'someone-else', maxMatches: 3 });
    expect(ml.rank.mock.calls[0][0]).toMatchObject({ id: 'own' });
    expect(students.findOne).not.toHaveBeenCalled();
  });
});
