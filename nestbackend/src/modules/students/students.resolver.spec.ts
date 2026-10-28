import { StudentsResolver } from './students.resolver';
import { UserRole } from '../../enums/auth/user-role';
import { requiresAuth, rolesOf } from '../../common/testing/metadata';

describe('StudentsResolver (authorization contract)', () => {
  it.each([
    ['students', [UserRole.ADMIN, UserRole.COMPANY]],
    ['createStudent', [UserRole.STUDENT, UserRole.ADMIN]],
    ['updateStudent', [UserRole.STUDENT, UserRole.ADMIN]],
    ['removeStudent', [UserRole.ADMIN]],
  ])('%s is restricted to %j', (method, roles) => {
    expect(rolesOf(StudentsResolver, method)).toEqual(roles);
  });

  it.each(['students', 'student', 'myStudentProfile', 'createStudent', 'updateStudent', 'removeStudent'])(
    '%s requires authentication (student data is PII)',
    (method) => expect(requiresAuth(StudentsResolver, method)).toBe(true),
  );
});
