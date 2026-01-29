import { Test, TestingModule } from '@nestjs/testing';
import { InternshipsService } from './internships.service';

describe('InternshipsService', () => {
  let service: InternshipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternshipsService],
    }).compile();

    service = module.get<InternshipsService>(InternshipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
