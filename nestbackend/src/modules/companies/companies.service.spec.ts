import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { adminP, companyP } from '../../common/testing/principals';

describe('CompaniesService', () => {
  let service: CompaniesService;
  const repo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)) };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue(null);
    service = new CompaniesService(repo as unknown as Repository<Company>);
  });

  it('a company user always owns the company they create', async () => {
    const saved = await service.create(companyP, { name: 'Acme', ownerUserId: 'someone-else' });
    expect(saved.ownerUserId).toBe(companyP.id);
  });

  it('a company user can create only one company', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'c1' });
    await expect(service.create(companyP, { name: 'Acme 2' })).rejects.toBeInstanceOf(ConflictException);
  });

  it("forbids editing another owner's company", async () => {
    repo.findOne.mockResolvedValue({ id: 'c1', ownerUserId: 'other' });
    await expect(service.update(companyP, 'c1', { name: 'Hacked' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only admins may transfer ownership', async () => {
    repo.findOne.mockResolvedValue({ id: 'c1', ownerUserId: companyP.id });
    const byOwner = await service.update(companyP, 'c1', { ownerUserId: 'new-owner' });
    expect(byOwner.ownerUserId).toBe(companyP.id);

    repo.findOne.mockResolvedValue({ id: 'c1', ownerUserId: companyP.id });
    const byAdmin = await service.update(adminP, 'c1', { ownerUserId: 'new-owner' });
    expect(byAdmin.ownerUserId).toBe('new-owner');
  });
});
