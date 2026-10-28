import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Internship } from './entities/internship.entity';
import { CreateInternshipInput, UpdateInternshipInput } from './dto/internship.input';
import { CompaniesService } from '../companies/companies.service';
import {
  AuthenticatedPrincipal,
  assertOwnerOrAdmin,
  isCompany,
} from '../../common/auth/principal';

export interface InternshipQuery {
  skip?: number;
  take?: number;
  search?: string;
  sector?: string;
  location?: string;
  companyId?: string;
  onlyActive?: boolean;
  onlyWithCapacity?: boolean;
}

@Injectable()
export class InternshipsService {
  private readonly logger = new Logger(InternshipsService.name);

  constructor(
    @InjectRepository(Internship)
    private readonly repo: Repository<Internship>,
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * COMPANY callers always post under their own company (companyId and
   * companyName come from the server, not the client). Admins may post for
   * any company, or as a free-text `companyName` with no linked company.
   */
  async create(principal: AuthenticatedPrincipal, input: CreateInternshipInput): Promise<Internship> {
    const data = { ...input };
    if (isCompany(principal)) {
      const company = await this.companiesService.requireOwnCompany(principal);
      data.companyId = company.id;
      data.companyName = company.name;
    } else if (data.companyId) {
      data.companyName = (await this.companiesService.findOne(data.companyId)).name;
    } else if (!data.companyName) {
      throw new BadRequestException('companyName or companyId is required');
    }
    return this.repo.save(this.repo.create(data));
  }

  async findAll(query: InternshipQuery = {}): Promise<Internship[]> {
    const {
      skip = 0,
      take = 50,
      search,
      sector,
      location,
      companyId,
      onlyActive,
      onlyWithCapacity,
    } = query;

    const qb = this.repo.createQueryBuilder('i');
    if (search) {
      qb.andWhere('(i.title ILIKE :s OR i.companyName ILIKE :s OR i.description ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (sector) qb.andWhere('i.sector = :sector', { sector });
    if (location) qb.andWhere('i.location = :location', { location });
    if (companyId) qb.andWhere('i.companyId = :companyId', { companyId });
    if (onlyActive) qb.andWhere('i.isActive = true');
    if (onlyWithCapacity) qb.andWhere('i.filledPositions < i.capacity');

    return qb.orderBy('i.createdAt', 'DESC').skip(skip).take(take).getMany();
  }

  /** Active internships with free seats — the default pool for matching. */
  async findEligibleForMatching(limit = 1000): Promise<Internship[]> {
    return this.findAll({ onlyActive: true, onlyWithCapacity: true, take: limit });
  }

  async findByIds(ids: string[]): Promise<Internship[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findOne(id: string): Promise<Internship> {
    const internship = await this.repo.findOne({
      where: { id },
      relations: ['company', 'applications'],
    });
    if (!internship) throw new NotFoundException(`Internship ${id} not found`);
    return internship;
  }

  /** Throws unless the caller is an admin or owns the internship's company. */
  async assertCanManage(principal: AuthenticatedPrincipal, internship: Internship): Promise<void> {
    const ownerUserId = internship.company?.ownerUserId
      ?? (internship.companyId
        ? (await this.companiesService.findOne(internship.companyId)).ownerUserId
        : undefined);
    assertOwnerOrAdmin(principal, ownerUserId, 'internship');
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    input: UpdateInternshipInput,
  ): Promise<Internship> {
    const internship = await this.findOne(id);
    await this.assertCanManage(principal, internship);
    const { companyId, companyName, ...rest } = input;
    // Companies cannot move a listing to another company or rename the poster.
    Object.assign(internship, isCompany(principal) ? rest : input);
    if (isCompany(principal) && (companyId || companyName)) {
      this.logger.warn(`Company user ${principal.id} tried to change company on internship ${id}; ignored`);
    }
    if (internship.capacity < internship.filledPositions) {
      throw new BadRequestException(
        `Capacity cannot be below the ${internship.filledPositions} seats already filled`,
      );
    }
    // `applications` was loaded for the ownership check; don't cascade-save it.
    delete internship.applications;
    return this.repo.save(internship);
  }

  async remove(principal: AuthenticatedPrincipal, id: string): Promise<boolean> {
    const internship = await this.findOne(id);
    await this.assertCanManage(principal, internship);
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
