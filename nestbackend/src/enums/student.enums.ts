import { registerEnumType } from '@nestjs/graphql';

/*
 * Domain enums shared by Student, Internship and the ML contract.
 *
 * Kept in a dependency-free file on purpose: the entity files import each other
 * in a cycle (Student → Application → MatchScore → Internship → …), and an enum
 * defined inside one of them can be `undefined` while another is still loading.
 * Values must stay in sync with ml-service/app/models/schemas.py.
 */

export enum SocialCategory {
  GENERAL = 'GENERAL',
  OBC = 'OBC',
  SC = 'SC',
  ST = 'ST',
  EWS = 'EWS',
}

export enum DistrictType {
  URBAN = 'URBAN',
  RURAL = 'RURAL',
  ASPIRATIONAL = 'ASPIRATIONAL',
}

export enum QualificationLevel {
  DIPLOMA = 'DIPLOMA',
  UNDERGRADUATE = 'UNDERGRADUATE',
  POSTGRADUATE = 'POSTGRADUATE',
  DOCTORATE = 'DOCTORATE',
}

registerEnumType(SocialCategory, { name: 'SocialCategory' });
registerEnumType(DistrictType, { name: 'DistrictType' });
registerEnumType(QualificationLevel, { name: 'QualificationLevel' });
