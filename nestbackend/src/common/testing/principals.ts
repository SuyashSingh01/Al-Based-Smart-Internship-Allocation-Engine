import { UserRole } from '../../enums/auth/user-role';
import type { AuthenticatedPrincipal } from '../auth/principal';

/** Test fixtures: authenticated principals for each role. */
export const principal = (role: UserRole, id = `${role}-user`): AuthenticatedPrincipal => ({
  id,
  role,
  typ: 'user',
  scopes: [],
  jti: 'test-jti',
});

export const adminP = principal(UserRole.ADMIN);
export const studentP = principal(UserRole.STUDENT);
export const companyP = principal(UserRole.COMPANY);
