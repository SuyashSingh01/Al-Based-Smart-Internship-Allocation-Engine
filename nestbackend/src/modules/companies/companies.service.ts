import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyInput, UpdateCompanyInput } from './dto/company.input';
import {
  AuthenticatedPrincipal,
  assertOwnerOrAdmin,
  isCompany,
} from '../../common/auth/principal';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * A COMPANY user creates exactly one company, owned by themselves.
   * Admins may create companies for any owner (or none).
   */
  async create(principal: AuthenticatedPrincipal, input: CreateCompanyInput): Promise<Company> {
    const data = { ...input };
    if (isCompany(principal)) {
      data.ownerUserId = principal.id;
      if (await this.findByOwnerUserId(principal.id)) {
        throw new ConflictException('You already own a company; update it instead');
      }
    }
    return this.companyRepo.save(this.companyRepo.create(data));
  }

  findAll(skip = 0, take = 50, search?: string): Promise<Company[]> {
    return this.companyRepo.find({
      where: search ? { name: ILike(`%${search}%`) } : undefined,
      skip,
      take: Math.min(take, 200),
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['internships'],
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  findByOwnerUserId(userId: string): Promise<Company | null> {
    return this.companyRepo.findOne({ where: { ownerUserId: userId } });
  }

  /** The caller's own company, or 404 — used by company-scoped operations. */
  async requireOwnCompany(principal: AuthenticatedPrincipal): Promise<Company> {
    const company = await this.findByOwnerUserId(principal.id);
    if (!company) throw new NotFoundException('Create your company profile first');
    return company;
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    input: UpdateCompanyInput,
  ): Promise<Company> {
    const company = await this.findOne(id);
    assertOwnerOrAdmin(principal, company.ownerUserId, 'company');
    // Ownership transfer is an admin-only operation.
    const { ownerUserId, ...rest } = input;
    Object.assign(company, isCompany(principal) ? rest : { ...rest, ownerUserId });
    return this.companyRepo.save(company);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.companyRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
