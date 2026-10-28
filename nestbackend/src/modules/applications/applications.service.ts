import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Internship } from '../internships/entities/internship.entity';
import { MatchScore } from '../matching/entities/match.entity';
import { StudentsService } from '../students/students.service';
import { InternshipsService } from '../internships/internships.service';
import { CreateApplicationInput, UpdateApplicationStatusInput } from './dto/application.input';
import {
  AuthenticatedPrincipal,
  assertOwnerOrAdmin,
  isAdmin,
  isCompany,
  isStudent,
} from '../../common/auth/principal';

/**
 * Application lifecycle (state machine). Anything not listed is rejected.
 *
 *   PENDING ──► MATCHED ──► ACCEPTED ──► WITHDRAWN
 *      │           │  └───► REJECTED
 *      │           └──────► WITHDRAWN
 *      ├──► ACCEPTED / REJECTED / WITHDRAWN
 *
 * REJECTED and WITHDRAWN are terminal. ACCEPTED consumes a seat
 * (filledPositions + 1); ACCEPTED → WITHDRAWN gives the seat back.
 */
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [
    ApplicationStatus.MATCHED,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.MATCHED]: [
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.ACCEPTED]: [ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>,
    private readonly dataSource: DataSource,
    private readonly studentsService: StudentsService,
    private readonly internshipsService: InternshipsService,
  ) {}

  /**
   * Apply to an internship. Students always apply as themselves (studentId is
   * taken from their profile). If the matcher already scored this pair, the
   * score is linked so recruiters see why the candidate fits.
   */
  async create(principal: AuthenticatedPrincipal, input: CreateApplicationInput): Promise<Application> {
    let studentId = input.studentId;
    if (isStudent(principal)) {
      studentId = (await this.studentsService.requireOwnProfile(principal)).id;
    } else if (!studentId) {
      throw new BadRequestException('studentId is required');
    } else {
      await this.studentsService.findOne(studentId);
    }

    const internship = await this.internshipsService.findOne(input.internshipId);
    if (!internship.isActive) throw new BadRequestException('Internship is not accepting applications');
    if (internship.filledPositions >= internship.capacity) {
      throw new BadRequestException('Internship is full');
    }

    const existing = await this.repo.findOne({
      where: { studentId, internshipId: input.internshipId },
    });
    if (existing) throw new ConflictException('Application already exists');

    const saved = await this.repo.save(
      this.repo.create({ studentId, internshipId: input.internshipId, coverLetter: input.coverLetter }),
    );
    await this.dataSource
      .getRepository(MatchScore)
      .update({ studentId, internshipId: input.internshipId }, { applicationId: saved.id });
    return this.findOne(saved.id);
  }

  findAll(skip = 0, take = 100): Promise<Application[]> {
    return this.repo.find({
      relations: ['student', 'internship', 'matchScore'],
      order: { appliedAt: 'DESC' },
      skip,
      take: Math.min(take, 500),
    });
  }

  async findByStudent(principal: AuthenticatedPrincipal, studentId: string): Promise<Application[]> {
    if (isStudent(principal)) {
      const own = await this.studentsService.requireOwnProfile(principal);
      if (own.id !== studentId) throw new ForbiddenException('You can only view your own applications');
    }
    return this.repo.find({
      where: { studentId },
      relations: ['internship', 'matchScore'],
      order: { appliedAt: 'DESC' },
    });
  }

  async findMine(principal: AuthenticatedPrincipal): Promise<Application[]> {
    const own = await this.studentsService.requireOwnProfile(principal);
    return this.findByStudent(principal, own.id);
  }

  async findByInternship(
    principal: AuthenticatedPrincipal,
    internshipId: string,
  ): Promise<Application[]> {
    const internship = await this.internshipsService.findOne(internshipId);
    await this.internshipsService.assertCanManage(principal, internship);
    return this.repo.find({
      where: { internshipId },
      relations: ['student', 'matchScore'],
      order: { appliedAt: 'DESC' },
    });
  }

  /** Internal lookup — no access control. */
  async findOne(id: string): Promise<Application> {
    const app = await this.repo.findOne({
      where: { id },
      relations: ['student', 'internship', 'internship.company', 'matchScore'],
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return app;
  }

  /** Visible to the applicant, the internship's company, and admins. */
  async findOneFor(principal: AuthenticatedPrincipal, id: string): Promise<Application> {
    const app = await this.findOne(id);
    await this.assertCanView(principal, app);
    return app;
  }

  /**
   * Companies (and admins) decide on applications: MATCHED / ACCEPTED / REJECTED.
   * Students use `withdraw` instead.
   */
  async updateStatus(
    principal: AuthenticatedPrincipal,
    id: string,
    input: UpdateApplicationStatusInput,
  ): Promise<Application> {
    const app = await this.findOne(id);
    if (!app.internship) throw new NotFoundException('Internship not found');
    await this.internshipsService.assertCanManage(principal, app.internship);
    if (isCompany(principal) && input.status === ApplicationStatus.WITHDRAWN) {
      throw new ForbiddenException('Only the applicant can withdraw an application');
    }
    return this.transition(app, input.status);
  }

  /** The applicant withdraws. Withdrawing an accepted offer frees the seat. */
  async withdraw(principal: AuthenticatedPrincipal, id: string): Promise<Application> {
    const app = await this.findOne(id);
    assertOwnerOrAdmin(principal, app.student?.userId, 'application');
    return this.transition(app, ApplicationStatus.WITHDRAWN);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private async assertCanView(principal: AuthenticatedPrincipal, app: Application): Promise<void> {
    if (isAdmin(principal)) return;
    if (isStudent(principal)) {
      assertOwnerOrAdmin(principal, app.student?.userId, 'application');
      return;
    }
    if (!app.internship) throw new NotFoundException('Internship not found');
    await this.internshipsService.assertCanManage(principal, app.internship);
  }

  /**
   * Validate the transition, then apply it. Seat accounting happens inside a
   * transaction with a row lock on the internship, so two recruiters accepting
   * the last seat concurrently cannot overfill it.
   */
  private async transition(app: Application, next: ApplicationStatus): Promise<Application> {
    if (app.status === next) return app;
    if (!APPLICATION_TRANSITIONS[app.status].includes(next)) {
      throw new BadRequestException(`Cannot move application from ${app.status} to ${next}`);
    }

    const seatDelta =
      next === ApplicationStatus.ACCEPTED ? 1 : app.status === ApplicationStatus.ACCEPTED ? -1 : 0;

    await this.dataSource.transaction(async (mgr) => {
      if (seatDelta !== 0) {
        const internshipRepo = mgr.getRepository(Internship);
        const internship = await internshipRepo.findOne({
          where: { id: app.internshipId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!internship) throw new NotFoundException('Internship not found');
        if (seatDelta > 0 && internship.filledPositions >= internship.capacity) {
          throw new BadRequestException('Internship is full');
        }
        internship.filledPositions = Math.max(0, internship.filledPositions + seatDelta);
        await internshipRepo.save(internship);
      }
      await mgr
        .getRepository(Application)
        .update(app.id, { status: next, respondedAt: new Date() });
    });

    this.logger.log(`Application ${app.id}: ${app.status} -> ${next}`);
    return this.findOne(app.id);
  }
}
