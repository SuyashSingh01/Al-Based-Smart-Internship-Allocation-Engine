import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApplicationsService, APPLICATION_TRANSITIONS } from './applications.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Internship } from '../internships/entities/internship.entity';
import { MatchScore } from '../matching/entities/match.entity';
import { StudentsService } from '../students/students.service';
import { InternshipsService } from '../internships/internships.service';
import { adminP, companyP, studentP } from '../../common/testing/principals';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repo: jest.Mocked<Pick<Repository<Application>, 'findOne' | 'find' | 'create' | 'save' | 'delete'>>;
  let lockedInternship: Partial<Internship>;
  const internshipRepo = { findOne: jest.fn(), save: jest.fn() };
  const appRepoInTx = { update: jest.fn() };
  const matchScoreRepo = { update: jest.fn() };
  const students = { requireOwnProfile: jest.fn(), findOne: jest.fn() };
  const internships = { findOne: jest.fn(), assertCanManage: jest.fn() };

  const app = (over: Partial<Application> = {}): Application =>
    ({
      id: 'app-1',
      studentId: 'stu-1',
      internshipId: 'int-1',
      status: ApplicationStatus.PENDING,
      student: { userId: studentP.id },
      internship: { id: 'int-1', companyId: 'co-1' },
      ...over,
    }) as Application;

  beforeEach(() => {
    jest.resetAllMocks();
    lockedInternship = { id: 'int-1', capacity: 2, filledPositions: 0 };
    internshipRepo.findOne.mockImplementation(async () => lockedInternship);
    repo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), delete: jest.fn() } as never;

    const mgr = {
      getRepository: (entity: unknown) => (entity === Internship ? internshipRepo : appRepoInTx),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof mgr) => unknown) => cb(mgr)),
      getRepository: (entity: unknown) => (entity === MatchScore ? matchScoreRepo : undefined),
    } as unknown as DataSource;

    service = new ApplicationsService(
      repo as unknown as Repository<Application>,
      dataSource,
      students as unknown as StudentsService,
      internships as unknown as InternshipsService,
    );
  });

  describe('create', () => {
    beforeEach(() => {
      students.requireOwnProfile.mockResolvedValue({ id: 'own-student' });
      internships.findOne.mockResolvedValue({ id: 'int-1', isActive: true, capacity: 2, filledPositions: 0 });
      repo.save.mockResolvedValue({ id: 'new-app' } as Application);
    });

    it('applies as the calling student, ignoring any studentId in the input', async () => {
      repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(app({ id: 'new-app' }));
      await service.create(studentP, { studentId: 'someone-else', internshipId: 'int-1' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'own-student' }));
      expect(matchScoreRepo.update).toHaveBeenCalledWith(
        { studentId: 'own-student', internshipId: 'int-1' },
        { applicationId: 'new-app' },
      );
    });

    it('rejects a full internship', async () => {
      internships.findOne.mockResolvedValue({ id: 'int-1', isActive: true, capacity: 1, filledPositions: 1 });
      await expect(service.create(studentP, { internshipId: 'int-1' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an inactive internship', async () => {
      internships.findOne.mockResolvedValue({ id: 'int-1', isActive: false, capacity: 2, filledPositions: 0 });
      await expect(service.create(studentP, { internshipId: 'int-1' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate application', async () => {
      repo.findOne.mockResolvedValueOnce(app());
      await expect(service.create(studentP, { internshipId: 'int-1' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('requires studentId for admins', async () => {
      await expect(service.create(adminP, { internshipId: 'int-1' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('state machine', () => {
    it('makes REJECTED and WITHDRAWN terminal', () => {
      expect(APPLICATION_TRANSITIONS[ApplicationStatus.REJECTED]).toEqual([]);
      expect(APPLICATION_TRANSITIONS[ApplicationStatus.WITHDRAWN]).toEqual([]);
    });

    it('accepting consumes a seat under a pessimistic lock', async () => {
      repo.findOne.mockResolvedValue(app());
      await service.updateStatus(companyP, 'app-1', { status: ApplicationStatus.ACCEPTED });
      expect(internshipRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(lockedInternship.filledPositions).toBe(1);
      expect(appRepoInTx.update).toHaveBeenCalledWith('app-1', expect.objectContaining({ status: ApplicationStatus.ACCEPTED }));
    });

    it('refuses to accept when the internship is full', async () => {
      lockedInternship = { id: 'int-1', capacity: 1, filledPositions: 1 };
      repo.findOne.mockResolvedValue(app());
      await expect(
        service.updateStatus(companyP, 'app-1', { status: ApplicationStatus.ACCEPTED }),
      ).rejects.toThrow('Internship is full');
    });

    it('rejects illegal transitions (ACCEPTED -> REJECTED)', async () => {
      repo.findOne.mockResolvedValue(app({ status: ApplicationStatus.ACCEPTED }));
      await expect(
        service.updateStatus(companyP, 'app-1', { status: ApplicationStatus.REJECTED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('withdrawing an accepted application frees the seat', async () => {
      lockedInternship = { id: 'int-1', capacity: 2, filledPositions: 2 };
      repo.findOne.mockResolvedValue(app({ status: ApplicationStatus.ACCEPTED }));
      await service.withdraw(studentP, 'app-1');
      expect(lockedInternship.filledPositions).toBe(1);
    });
  });

  describe('authorization', () => {
    it('companies cannot withdraw on behalf of a student', async () => {
      repo.findOne.mockResolvedValue(app());
      await expect(
        service.updateStatus(companyP, 'app-1', { status: ApplicationStatus.WITHDRAWN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("a student cannot withdraw someone else's application", async () => {
      repo.findOne.mockResolvedValue(app({ student: { userId: 'another-user' } as never }));
      await expect(service.withdraw(studentP, 'app-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('company decisions are gated by internship ownership', async () => {
      repo.findOne.mockResolvedValue(app());
      internships.assertCanManage.mockRejectedValue(new ForbiddenException());
      await expect(
        service.updateStatus(companyP, 'app-1', { status: ApplicationStatus.REJECTED }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
