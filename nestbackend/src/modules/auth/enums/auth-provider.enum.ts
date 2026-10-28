import { registerEnumType } from '@nestjs/graphql';

/**
 * Identity providers we accept. `LOCAL` = email/password.
 * `SERVICE` = machine-to-machine client credentials.
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  META = 'META',
  GITHUB = 'GITHUB',
  APPLE = 'APPLE',
  SERVICE = 'SERVICE',
}

registerEnumType(AuthProvider, { name: 'AuthProvider' });
