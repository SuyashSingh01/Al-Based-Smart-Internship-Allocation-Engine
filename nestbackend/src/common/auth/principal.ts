import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../enums/auth/user-role';
import type { AuthenticatedPrincipal } from '../../modules/auth/strategies/jwt.strategy';

export type { AuthenticatedPrincipal };

export const isAdmin = (p: AuthenticatedPrincipal): boolean => p.role === UserRole.ADMIN;
export const isStudent = (p: AuthenticatedPrincipal): boolean => p.role === UserRole.STUDENT;
export const isCompany = (p: AuthenticatedPrincipal): boolean => p.role === UserRole.COMPANY;

/**
 * Object-level authorization: RBAC (`@Roles`) decides *which operations* a role
 * may call; this decides *which records* a caller may touch. Admins pass.
 */
export function assertOwnerOrAdmin(
  principal: AuthenticatedPrincipal,
  ownerUserId: string | null | undefined,
  what = 'resource',
): void {
  if (isAdmin(principal)) return;
  if (!ownerUserId || ownerUserId !== principal.id) {
    throw new ForbiddenException(`You do not have access to this ${what}`);
  }
}
