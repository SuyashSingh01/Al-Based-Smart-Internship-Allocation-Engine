// src/modules/auth/interfaces/jwt-payload.interface.ts
import { UserRole } from '../../enums/auth/user-role';

export interface JwtPayload {
  email: string;
  sub: string;
  role: UserRole;
}