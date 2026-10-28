import { CompaniesResolver } from './companies.resolver';
import { UserRole } from '../../enums/auth/user-role';
import { requiresAuth, rolesOf } from '../../common/testing/metadata';

describe('CompaniesResolver (authorization contract)', () => {
  it.each(['companies', 'company'])('%s is public (company directory)', (method) => {
    expect(requiresAuth(CompaniesResolver, method)).toBe(false);
  });

  it.each([
    ['myCompany', [UserRole.COMPANY]],
    ['createCompany', [UserRole.ADMIN, UserRole.COMPANY]],
    ['updateCompany', [UserRole.ADMIN, UserRole.COMPANY]],
    ['removeCompany', [UserRole.ADMIN]],
  ])('%s requires auth and roles %j', (method, roles) => {
    expect(requiresAuth(CompaniesResolver, method)).toBe(true);
    expect(rolesOf(CompaniesResolver, method)).toEqual(roles);
  });
});
