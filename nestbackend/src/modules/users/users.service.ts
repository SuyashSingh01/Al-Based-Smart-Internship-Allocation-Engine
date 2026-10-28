// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CacheService } from '../../common/cache/cache.service';
import { UserRole } from '../../enums/auth/user-role';

@Injectable()
export class UsersService {
  private readonly USER_TTL = 300; // 5 minutes
  private readonly KEY_ID = (id: string) => `user:id:${id}`;
  private readonly KEY_EMAIL = (email: string) => `user:email:${email.toLowerCase()}`;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private cache: CacheService,
  ) {}

  /** Admin listing; not cached (low traffic, must be fresh). */
  findAll(opts: { skip?: number; take?: number; role?: UserRole } = {}): Promise<User[]> {
    return this.usersRepository.find({
      where: opts.role ? { role: opts.role } : undefined,
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? 50, 200),
      order: { createdAt: 'DESC' },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.cache.getOrSet(
      this.KEY_EMAIL(email),
      () => this.usersRepository.findOne({ where: { email } }),
      this.USER_TTL,
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.cache.getOrSet(
      this.KEY_ID(id),
      () => this.usersRepository.findOne({ where: { id } }),
      this.USER_TTL,
    );
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    const saved = await this.usersRepository.save(newUser);
    await this.invalidate(saved);
    return saved;
  }

  /** Drop cached copies of a user after any write that bypasses this service. */
  async invalidate(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const keys: string[] = [];
    if (user.id) keys.push(this.KEY_ID(user.id));
    if (user.email) keys.push(this.KEY_EMAIL(user.email));
    if (keys.length) await this.cache.del(...keys);
  }
}