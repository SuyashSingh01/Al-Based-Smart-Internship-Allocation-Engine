import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../../enums/auth/user-role';

describe('AuthService', () => {
  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'u1', ...x })),
    createQueryBuilder: jest.fn(),
  };
  const tokens = {
    issueTokenPair: jest.fn().mockResolvedValue({
      accessToken: 'a', refreshToken: 'r', refreshJti: 'rj', refreshTokenExpiresIn: 60, accessTokenExpiresIn: 60,
    }),
  };
  const refresh = { store: jest.fn() };
  const users = { invalidate: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findOne.mockResolvedValue(null);
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      users as unknown as UsersService,
      tokens as unknown as TokenService,
      refresh as unknown as RefreshTokenService,
    );
  });

  describe('register', () => {
    const base = { name: ' Asha ', email: ' Asha@Example.COM ', password: 'longpassword1' };

    it('refuses self-registration as ADMIN (privilege escalation)', async () => {
      await expect(service.register({ ...base, role: UserRole.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('defaults to STUDENT, normalises email and hashes the password', async () => {
      const { user } = await service.register(base);
      const created = userRepo.create.mock.calls[0][0];
      expect(created.role).toBe(UserRole.STUDENT);
      expect(created.email).toBe('asha@example.com');
      expect(created.password).not.toBe(base.password);
      expect(await bcrypt.compare(base.password, created.password)).toBe(true);
      expect(user).not.toHaveProperty('password');
    });

    it('allows COMPANY sign-up', async () => {
      await service.register({ ...base, role: UserRole.COMPANY });
      expect(userRepo.create.mock.calls[0][0].role).toBe(UserRole.COMPANY);
    });

    it('rejects duplicate emails', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'x' });
      await expect(service.register(base)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    const qb = (user: unknown) => ({
      addSelect: () => ({ where: () => ({ getOne: () => Promise.resolve(user) }) }),
    });

    it('rejects unknown users and wrong passwords with the same error', async () => {
      userRepo.createQueryBuilder.mockReturnValue(qb(null));
      await expect(service.login({ email: 'a@b.c', password: 'x' })).rejects.toThrow('Invalid credentials');

      const hash = await bcrypt.hash('right', 4);
      userRepo.createQueryBuilder.mockReturnValue(qb({ id: 'u1', password: hash }));
      await expect(service.login({ email: 'a@b.c', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a session, persists the refresh token and drops the cached user', async () => {
      const hash = await bcrypt.hash('right', 4);
      userRepo.createQueryBuilder.mockReturnValue(qb({ id: 'u1', email: 'a@b.c', password: hash, role: UserRole.STUDENT }));
      const res = await service.login({ email: 'a@b.c', password: 'right' });
      expect(res.tokens.accessToken).toBe('a');
      expect(refresh.store).toHaveBeenCalledWith('u1', 'rj', 'r', 60, expect.any(String));
      expect(users.invalidate).toHaveBeenCalled();
      expect(res.user).not.toHaveProperty('password');
    });
  });
});
