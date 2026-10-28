import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../../enums/auth/user-role';
import { AuthProvider } from '../enums/auth-provider.enum';
import { OAuthProfile } from '../interfaces/oauth-profile.interface';

/**
 * Upsert an application user from a normalised OAuthProfile. Handles the
 * "same email logged in via two providers" case by linking to the existing
 * account instead of creating duplicates.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async upsertUserFromProfile(profile: OAuthProfile): Promise<User> {
    // 1. Prefer exact match by provider identity (stable id, doesn't change).
    let user = await this.userRepo.findOne({
      where: {
        authProvider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    // 2. Fall back to email match: user probably signed up with LOCAL first
    //    and is now signing in via a social provider. Link the accounts.
    if (!user) {
      const byEmail = await this.userRepo.findOne({ where: { email: profile.email.toLowerCase() } });
      if (byEmail) {
        // Only link when the provider vouches for the email. Otherwise anyone
        // who registers that address at a provider could take over the account.
        if (!profile.emailVerified) {
          throw new ConflictException(
            `An account with this email already exists. Sign in with your password; ` +
              `${profile.provider} could not confirm this email is verified.`,
          );
        }
        this.logger.log(
          `Linking existing user ${byEmail.id} to ${profile.provider} identity ${profile.providerAccountId}`,
        );
        byEmail.authProvider = profile.provider;
        byEmail.providerAccountId = profile.providerAccountId;
        byEmail.emailVerified = byEmail.emailVerified || profile.emailVerified;
        byEmail.avatarUrl = byEmail.avatarUrl ?? profile.avatarUrl;
        byEmail.lastLoginAt = new Date();
        return this.userRepo.save(byEmail);
      }
    }

    // 3. Brand-new account.
    if (!user) {
      user = this.userRepo.create({
        email: profile.email.toLowerCase(),
        name: profile.name,
        role: UserRole.STUDENT,
        authProvider: profile.provider,
        providerAccountId: profile.providerAccountId,
        emailVerified: profile.emailVerified,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: new Date(),
      });
    } else {
      user.lastLoginAt = new Date();
      user.name = user.name || profile.name;
      user.avatarUrl = user.avatarUrl ?? profile.avatarUrl;
    }

    return this.userRepo.save(user);
  }
}
