import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InternshipsService } from './internships.service';
import { Internship } from './entities/internship.entity';
import { CreateInternshipInput } from './dto/internship.input';
import { CompaniesService } from '../companies/companies.service';
import { adminP, companyP } from '../../common/testing/principals';
import { QualificationLevel } from '../../enums/student.enums';

const input = (over: Partial<CreateInternshipInput> = {}): CreateInternshipInput => ({
  title: 'ML Intern',
  description: 'desc',
  requiredSkills: ['python'],
  preferredQualification: QualificationLevel.UNDERGRADUATE,
  sector: 'Technology',
  location: 'Delhi',
  durationMonths: 6,
  capacity: 2,
  minCgpa: 6,
  ...over,
});

describe('InternshipsService', () => {
  let service: InternshipsService;
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(x)),
    delete: jest.fn(),
  };
  const companies = { requireOwnCompany: jest.fn(), findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InternshipsService(
      repo as unknown as Repository<Internship>,
      companies as unknown as CompaniesService,
    );
  });

  it("posts under the company user's own company, ignoring client-supplied company fields", async () => {
    companies.requireOwnCompany.mockResolvedValue({ id: 'co-1', name: 'Acme' });
    const saved = await service.create(companyP, input({ companyId: 'co-evil', companyName: 'Spoofed' }));
    expect(saved).toMatchObject({ companyId: 'co-1', companyName: 'Acme' });
  });

  it('a company user without a company profile cannot post', async () => {
    companies.requireOwnCompany.mockRejectedValue(new NotFoundException());
    await expect(service.create(companyP, input())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('admins must name a company', async () => {
    await expect(service.create(adminP, input())).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(adminP, input({ companyName: 'Gov' }))).resolves.toMatchObject({ companyName: 'Gov' });
  });

  it("forbids editing another company's internship", async () => {
    repo.findOne.mockResolvedValue({ id: 'i1', companyId: 'co-2', company: { ownerUserId: 'other' } });
    await expect(service.update(companyP, 'i1', { title: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(companyP, 'i1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects shrinking capacity below filled seats', async () => {
    repo.findOne.mockResolvedValue({
      id: 'i1',
      capacity: 5,
      filledPositions: 3,
      company: { ownerUserId: companyP.id },
    });
    await expect(service.update(companyP, 'i1', { capacity: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
