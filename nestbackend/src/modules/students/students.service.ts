import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentInput, UpdateStudentInput } from './dto/student.input';
import {
  AuthenticatedPrincipal,
  assertOwnerOrAdmin,
  isStudent,
} from '../../common/auth/principal';

export interface StudentQueryOptions {
  skip?: number;
  take?: number;
  search?: string;
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  /**
   * Create a student profile. A STUDENT caller always creates *their own*
   * profile (userId is forced to the caller; one profile per user). Admins may
   * create profiles for anyone, optionally linked to a user via `userId`.
   */
  async create(principal: AuthenticatedPrincipal, input: CreateStudentInput): Promise<Student> {
    const data: CreateStudentInput = { ...input, email: input.email.trim().toLowerCase() };
    if (isStudent(principal)) {
      data.userId = principal.id;
      if (await this.findByUserId(principal.id)) {
        throw new ConflictException('You already have a student profile; update it instead');
      }
    }
    const exists = await this.studentRepo.findOne({ where: { email: data.email } });
    if (exists) throw new ConflictException('Student with this email already exists');
    return this.studentRepo.save(this.studentRepo.create(data));
  }

  async findAll(opts: StudentQueryOptions = {}): Promise<Student[]> {
    const { skip = 0, take = 50, search } = opts;
    const where: FindOptionsWhere<Student>[] | undefined = search
      ? [{ name: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }]
      : undefined;
    return this.studentRepo.find({
      where,
      skip,
      take: Math.min(take, 200),
      order: { createdAt: 'DESC' },
    });
  }

  async count(): Promise<number> {
    return this.studentRepo.count();
  }

  /** Internal lookup — no access control. Use `findOneFor` from resolvers. */
  async findOne(id: string): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: ['applications'],
    });
    if (!student) throw new NotFoundException(`Student ${id} not found`);
    return student;
  }

  /**
   * Students may only read their own profile. Companies and admins may read
   * any profile (recruiters need to see applicants).
   */
  async findOneFor(principal: AuthenticatedPrincipal, id: string): Promise<Student> {
    const student = await this.findOne(id);
    if (isStudent(principal)) assertOwnerOrAdmin(principal, student.userId, 'student profile');
    return student;
  }

  /** Ids of all student profiles (oldest first), for "match everyone" batch runs. */
  async findAllIds(limit: number): Promise<string[]> {
    const rows = await this.studentRepo.find({ select: { id: true }, order: { createdAt: 'ASC' }, take: limit });
    return rows.map((r) => r.id);
  }

  async findByIds(ids: string[]): Promise<Student[]> {
    if (!ids.length) return [];
    return this.studentRepo.find({ where: { id: In(ids) } });
  }

  async findByUserId(userId: string): Promise<Student | null> {
    return this.studentRepo.findOne({ where: { userId } });
  }

  /** The caller's own profile, or 404 — used by student-scoped operations. */
  async requireOwnProfile(principal: AuthenticatedPrincipal): Promise<Student> {
    const student = await this.findByUserId(principal.id);
    if (!student) throw new NotFoundException('Create your student profile first');
    return student;
  }

  async findByEmail(email: string): Promise<Student | null> {
    return this.studentRepo.findOne({ where: { email } });
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    input: UpdateStudentInput,
  ): Promise<Student> {
    const student = await this.findOne(id);
    assertOwnerOrAdmin(principal, student.userId, 'student profile');
    // Students cannot re-point their profile at another user account.
    const { userId, ...rest } = input;
    Object.assign(student, isStudent(principal) ? rest : input);
    if (userId !== undefined && isStudent(principal)) {
      this.logger.warn(`Student ${principal.id} tried to change userId on profile ${id}; ignored`);
    }
    return this.studentRepo.save(student);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.studentRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
