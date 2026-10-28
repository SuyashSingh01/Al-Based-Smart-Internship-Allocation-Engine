/**
 * Demo / bootstrap data.
 *
 *   npm run seed                              # dev (ts-node)
 *   node dist/scripts/seed.js                 # built / inside Docker
 *
 * Creates (idempotently — re-running skips what exists):
 *   - an ADMIN user  (the only supported way to create the first admin,
 *     since self-registration as admin is blocked)
 *   - a COMPANY user + company + a set of internships
 *   - a STUDENT login user with a profile, plus extra student profiles
 *
 * Passwords come from SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD. In
 * production both are required; in dev they default to printed values.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource, DeepPartial, Repository } from 'typeorm';

import { AppModule } from '../app.module';
import { User } from '../modules/users/entities/user.entity';
import { Company } from '../modules/companies/entities/company.entity';
import { Internship } from '../modules/internships/entities/internship.entity';
import { Student } from '../modules/students/entities/student.entity';
import { UserRole } from '../enums/auth/user-role';
import { AuthProvider } from '../modules/auth/enums/auth-provider.enum';
import { DistrictType, QualificationLevel, SocialCategory } from '../enums/student.enums';

const logger = new Logger('Seed');

function password(envKey: string, devDefault: string): string {
  const value = process.env[envKey];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} must be set when seeding in production`);
  }
  return devDefault;
}

async function upsertUser(
  repo: Repository<User>,
  email: string,
  name: string,
  role: UserRole,
  plain: string,
): Promise<User> {
  const existing = await repo.findOne({ where: { email } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      email,
      name,
      role,
      password: await bcrypt.hash(plain, 12),
      authProvider: AuthProvider.LOCAL,
      emailVerified: true,
    }),
  );
}

const INTERNSHIPS: Array<DeepPartial<Internship>> = [
  {
    title: 'Machine Learning Intern',
    description: 'Build and evaluate ML models for demand forecasting using Python and scikit-learn.',
    requiredSkills: ['python', 'machine learning', 'sql'],
    preferredSkills: ['pandas', 'scikit-learn'],
    sector: 'Technology', location: 'Bangalore', minCgpa: 7.0, capacity: 3,
    preferredFields: ['Computer Science', 'Data Science'],
  },
  {
    title: 'Backend Developer Intern',
    description: 'Develop REST and GraphQL APIs with Node.js and PostgreSQL.',
    requiredSkills: ['javascript', 'node.js', 'postgresql'],
    preferredSkills: ['typescript', 'docker'],
    sector: 'Technology', location: 'Pune', minCgpa: 6.5, capacity: 4,
    preferredFields: ['Computer Science', 'Information Technology'],
  },
  {
    title: 'Data Analyst Intern',
    description: 'Analyse operational data and build dashboards in Power BI and Excel.',
    requiredSkills: ['excel', 'sql', 'data analysis'],
    preferredSkills: ['power bi', 'tableau'],
    sector: 'Finance', location: 'Mumbai', minCgpa: 6.0, capacity: 5,
    preferredFields: ['Economics', 'Mathematics', 'Statistics'],
  },
  {
    title: 'Rural Healthcare Operations Intern',
    description: 'Support primary health centres with data collection and field coordination.',
    requiredSkills: ['communication', 'excel'],
    preferredSkills: ['data analysis'],
    sector: 'Healthcare', location: 'Jaipur', minCgpa: 5.5, capacity: 6,
    requiredLanguages: ['Hindi'],
  },
  {
    title: 'Embedded Systems Intern',
    description: 'Firmware development for IoT sensors in C on ARM microcontrollers.',
    requiredSkills: ['c', 'embedded systems', 'electronics'],
    preferredSkills: ['iot'],
    sector: 'Manufacturing', location: 'Chennai', minCgpa: 7.0, capacity: 2,
    preferredFields: ['Electronics'],
  },
  {
    title: 'Frontend Developer Intern',
    description: 'Build accessible React interfaces for citizen-facing services.',
    requiredSkills: ['javascript', 'react', 'css'],
    preferredSkills: ['typescript', 'figma'],
    sector: 'Government', location: 'Delhi', minCgpa: 6.0, capacity: 3,
  },
];

const STUDENTS: Array<DeepPartial<Student>> = [
  { name: 'Aarav Sharma', skills: ['python', 'machine learning', 'sql', 'pandas'], fieldOfStudy: 'Computer Science', cgpa: 8.6, locationPreference: ['Bangalore', 'Pune'], sectorInterests: ['Technology'], socialCategory: SocialCategory.GENERAL, districtType: DistrictType.URBAN, pastInternships: 1, languages: ['English', 'Hindi'] },
  { name: 'Priya Nair', skills: ['javascript', 'node.js', 'postgresql', 'typescript'], fieldOfStudy: 'Information Technology', cgpa: 7.9, locationPreference: ['Pune', 'Mumbai'], sectorInterests: ['Technology'], socialCategory: SocialCategory.OBC, districtType: DistrictType.RURAL, pastInternships: 0, languages: ['English', 'Malayalam'] },
  { name: 'Rohit Meena', skills: ['excel', 'communication', 'data analysis'], fieldOfStudy: 'Economics', cgpa: 7.1, locationPreference: ['Jaipur', 'Delhi'], sectorInterests: ['Healthcare', 'Government'], socialCategory: SocialCategory.ST, districtType: DistrictType.ASPIRATIONAL, pastInternships: 0, languages: ['Hindi', 'English'] },
  { name: 'Sneha Iyer', skills: ['c', 'embedded systems', 'electronics', 'iot'], fieldOfStudy: 'Electronics', cgpa: 8.2, locationPreference: ['Chennai'], sectorInterests: ['Manufacturing'], socialCategory: SocialCategory.GENERAL, districtType: DistrictType.URBAN, pastInternships: 2, languages: ['English', 'Tamil'] },
  { name: 'Imran Khan', skills: ['sql', 'excel', 'power bi'], fieldOfStudy: 'Mathematics', cgpa: 6.8, locationPreference: ['Mumbai'], sectorInterests: ['Finance'], socialCategory: SocialCategory.EWS, districtType: DistrictType.URBAN, pastInternships: 0, languages: ['English', 'Hindi'] },
  { name: 'Kavya Reddy', skills: ['react', 'javascript', 'css', 'figma'], fieldOfStudy: 'Computer Science', cgpa: 8.9, locationPreference: ['Delhi', 'Bangalore'], sectorInterests: ['Government', 'Technology'], socialCategory: SocialCategory.SC, districtType: DistrictType.RURAL, pastInternships: 1, languages: ['English', 'Telugu'] },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get(DataSource);
    const users = ds.getRepository(User);
    const companies = ds.getRepository(Company);
    const internships = ds.getRepository(Internship);
    const students = ds.getRepository(Student);

    const adminPw = password('SEED_ADMIN_PASSWORD', 'Admin@12345');
    const userPw = password('SEED_USER_PASSWORD', 'Passw0rd!123');

    await upsertUser(users, 'admin@internship.local', 'Platform Admin', UserRole.ADMIN, adminPw);
    const recruiter = await upsertUser(users, 'recruiter@acme.local', 'Acme Recruiter', UserRole.COMPANY, userPw);
    const studentUser = await upsertUser(users, 'student@internship.local', 'Aarav Sharma', UserRole.STUDENT, userPw);

    let company = await companies.findOne({ where: { ownerUserId: recruiter.id } });
    if (!company) {
      company = await companies.save(
        companies.create({
          name: 'Acme Technologies',
          sector: 'Technology',
          headquartersLocation: 'Bangalore',
          website: 'https://acme.example.com',
          description: 'Demo company created by the seed script.',
          ownerUserId: recruiter.id,
        }),
      );
    }

    let createdInternships = 0;
    for (const i of INTERNSHIPS) {
      if (await internships.findOne({ where: { title: i.title as string, companyId: company.id } })) continue;
      await internships.save(
        internships.create({
          ...i,
          companyId: company.id,
          companyName: company.name,
          preferredQualification: QualificationLevel.UNDERGRADUATE,
          durationMonths: 6,
          stipend: 15000,
          isActive: true,
        }),
      );
      createdInternships++;
    }

    let createdStudents = 0;
    for (const [idx, s] of STUDENTS.entries()) {
      const email = `${(s.name as string).toLowerCase().replace(/\s+/g, '.')}@student.local`;
      const linkedEmail = idx === 0 ? 'student@internship.local' : email;
      if (await students.findOne({ where: { email: linkedEmail } })) continue;
      await students.save(
        students.create({
          ...s,
          email: linkedEmail,
          qualification: QualificationLevel.UNDERGRADUATE,
          userId: idx === 0 ? studentUser.id : undefined,
        }),
      );
      createdStudents++;
    }

    logger.log(`Seed complete: +${createdInternships} internships, +${createdStudents} students`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      logger.warn(
        `Dev credentials — admin@internship.local / ${adminPw}; recruiter@acme.local and ` +
          `student@internship.local / ${userPw}. Set SEED_*_PASSWORD to override.`,
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
