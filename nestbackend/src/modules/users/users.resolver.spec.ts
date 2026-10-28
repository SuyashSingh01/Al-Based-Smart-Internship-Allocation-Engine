import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { UserRole } from '../../enums/auth/user-role';
import { requiresAuth, rolesOf } from '../../common/testing/metadata';

describe('UsersResolver', () => {
  it('user listing is admin-only', () => {
    expect(requiresAuth(UsersResolver, 'users')).toBe(true);
    expect(rolesOf(UsersResolver, 'users')).toEqual([UserRole.ADMIN]);
  });

  it('forwards paging and role filter', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    await new UsersResolver(service as unknown as UsersService).users(10, 5, UserRole.STUDENT);
    expect(service.findAll).toHaveBeenCalledWith({ skip: 10, take: 5, role: UserRole.STUDENT });
  });
});
