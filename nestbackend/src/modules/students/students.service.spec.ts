import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { CreateStudentInput } from './dto/student.input';
import { adminP, companyP, studentP } from '../../common/testing/principals';
import { DistrictType, QualificationLevel, SocialCategory } from '../../enums/student.enums';

const input = (over: Partial<CreateStudentInput> = {}): CreateStudentInput => ({
  name: 'Asha',
  email: 'Asha@Example.com ',
  skills: ['python'],
  qualification: QualificationLevel.UNDERGRADUATE,
  fieldOfStudy: 'CS',
  cgpa: 8,
  locationPreference: ['Delhi'],
  sectorInterests: ['Technology'],
  socialCategory: SocialCategory.GENERAL,
  districtType: DistrictType.URBAN,
  pastInternships: 0,
  ...over,
});

describe('StudentsService', () => {
  let service: StudentsService;
  const repo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)) };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue(null);
    service = new StudentsService(repo as unknown as Repository<Student>);
  });

  it('binds a student-created profile to the caller and normalises email', async () => {
    const saved = await service.create(studentP, input({ userId: 'someone-else' }));
    expect(saved.userId).toBe(studentP.id);
    expect(saved.email).toBe('asha@example.com');
  });

  it('allows only one profile per student user', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'existing' }); // findByUserId
    await expect(service.create(studentP, input())).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets admins create profiles for other users', async () => {
    const saved = await service.create(adminP, input({ userId: 'u-42' }));
    expect(saved.userId).toBe('u-42');
  });

  it("forbids a student from updating another student's profile", async () => {
    repo.findOne.mockResolvedValue({ id: 's2', userId: 'other-user' });
    await expect(service.update(studentP, 's2', { cgpa: 1 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ignores attempts by a student to re-point their profile at another user', async () => {
    repo.findOne.mockResolvedValue({ id: 's1', userId: studentP.id, cgpa: 7 });
    const updated = await service.update(studentP, 's1', { cgpa: 9, userId: 'hijack' });
    expect(updated.cgpa).toBe(9);
    expect(updated.userId).toBe(studentP.id);
  });

  it('lets companies read applicant profiles but students only their own', async () => {
    repo.findOne.mockResolvedValue({ id: 's2', userId: 'other-user' });
    await expect(service.findOneFor(companyP, 's2')).resolves.toMatchObject({ id: 's2' });
    await expect(service.findOneFor(studentP, 's2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
