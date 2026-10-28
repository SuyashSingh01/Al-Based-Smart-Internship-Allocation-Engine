import { InternshipsResolver } from './internships.resolver';
import { InternshipsService } from './internships.service';
import { UserRole } from '../../enums/auth/user-role';
import { requiresAuth, rolesOf } from '../../common/testing/metadata';

describe('InternshipsResolver', () => {
  it.each(['internships', 'internship'])('%s is public (browse without login)', (method) => {
    expect(requiresAuth(InternshipsResolver, method)).toBe(false);
  });

  it.each(['createInternship', 'updateInternship', 'removeInternship'])(
    '%s requires auth as ADMIN or COMPANY',
    (method) => {
      expect(requiresAuth(InternshipsResolver, method)).toBe(true);
      expect(rolesOf(InternshipsResolver, method)).toEqual([UserRole.ADMIN, UserRole.COMPANY]);
    },
  );

  it('caps page size at 200 to protect the database', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    const resolver = new InternshipsResolver(service as unknown as InternshipsService);
    await resolver.internships(0, 10_000);
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });
});
