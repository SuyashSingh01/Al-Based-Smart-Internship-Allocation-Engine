import { Test, TestingModule } from '@nestjs/testing';
import { InternshipsResolver } from './internships.resolver';

describe('InternshipsResolver', () => {
  let resolver: InternshipsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternshipsResolver],
    }).compile();

    resolver = module.get<InternshipsResolver>(InternshipsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
