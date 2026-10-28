import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exportJWK, generateKeyPair, importPKCS8, importSPKI, JWK, KeyLike } from 'jose';
import { createHash, randomUUID } from 'crypto';

/**
 * Owns the RSA keypair used to sign / verify our JWTs.
 *
 * Behaviour:
 *  - If `JWT_PRIVATE_KEY` (and optionally `JWT_PUBLIC_KEY`) are set, they are
 *    imported as PKCS8 / SPKI PEMs. Recommended for production.
 *  - Otherwise a fresh keypair is generated on boot. Fine for dev.
 *
 * Publishes public keys as JWKS with a stable `kid` derived from the modulus,
 * so downstream services can fetch and cache them.
 */
@Injectable()
export class KeystoreService implements OnModuleInit {
  private readonly logger = new Logger(KeystoreService.name);

  private privateKey!: KeyLike;
  private publicKey!: KeyLike;
  private publicJwk!: JWK;
  private _kid!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const pkcs8 = this.config.get<string>('JWT_PRIVATE_KEY');
    const spki = this.config.get<string>('JWT_PUBLIC_KEY');

    if (pkcs8 && spki) {
      this.privateKey = await importPKCS8(this.normalizePem(pkcs8), 'RS256');
      this.publicKey = await importSPKI(this.normalizePem(spki), 'RS256');
      this.logger.log('Loaded RSA keypair from environment');
    } else {
      const { publicKey, privateKey } = await generateKeyPair('RS256', {
        modulusLength: 2048,
        extractable: true,
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.logger.warn(
        'JWT_PRIVATE_KEY / JWT_PUBLIC_KEY not set. Generated ephemeral keypair. ' +
          'Tokens will not survive restart. Set env vars in production.',
      );
    }

    this.publicJwk = await exportJWK(this.publicKey);
    this._kid = this.deriveKid(this.publicJwk);
    this.publicJwk = { ...this.publicJwk, kid: this._kid, alg: 'RS256', use: 'sig' };
  }

  get kid(): string {
    return this._kid;
  }

  getPrivateKey(): KeyLike {
    return this.privateKey;
  }

  getPublicKey(): KeyLike {
    return this.publicKey;
  }

  /** Returns the JWKS document served at /.well-known/jwks.json */
  getJwks(): { keys: JWK[] } {
    return { keys: [this.publicJwk] };
  }

  private normalizePem(pem: string): string {
    // Support env vars that use `\n` literals for newlines.
    return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
  }

  private deriveKid(jwk: JWK): string {
    // Stable, non-secret identifier: sha256 of the modulus, truncated.
    if (jwk.n) {
      return createHash('sha256').update(jwk.n).digest('hex').slice(0, 16);
    }
    return randomUUID();
  }
}
