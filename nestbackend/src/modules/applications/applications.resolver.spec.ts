import { ApplicationsResolver } from './applications.resolver';
import { ApplicationsService } from './applications.service';
import { UserRole } from '../../enums/auth/user-role';
import { requiresAuth, rolesOf } from '../../common/testing/metadata';
import { studentP } from '../../common/testing/principals';

describe('ApplicationsResolver (authorization contract)', () => {
  it.each([
    ['applications', [UserRole.ADMIN]],
    ['myApplications', [UserRole.STUDENT]],
    ['applicationsByInternship', [UserRole.ADMIN, UserRole.COMPANY]],
    ['createApplication', [UserRole.STUDENT, UserRole.ADMIN]],
    ['updateApplicationStatus', [UserRole.ADMIN, UserRole.COMPANY]],
    ['withdrawApplication', [UserRole.STUDENT, UserRole.ADMIN]],
    ['removeApplication', [UserRole.ADMIN]],
  ])('%s is restricted to %j', (method, roles) => {
    expect(requiresAuth(ApplicationsResolver, method)).toBe(true);
    expect(rolesOf(ApplicationsResolver, method)).toEqual(roles);
  });

  it('passes the caller to the service so ownership can be enforced', async () => {
    const service = { create: jest.fn().mockResolvedValue({}) };
    const resolver = new ApplicationsResolver(service as unknown as ApplicationsService);
    await resolver.createApplication(studentP, { internshipId: 'i1' });
    expect(service.create).toHaveBeenCalledWith(studentP, { internshipId: 'i1' });
  });
});
