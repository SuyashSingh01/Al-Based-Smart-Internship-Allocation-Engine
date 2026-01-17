import { Test, TestingModule } from '@nestjs/testing';
import { InternshipsController } from './internships.controller';

describe('InternshipsController', () => {
  let controller: InternshipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternshipsController],
    }).compile();

    controller = module.get<InternshipsController>(InternshipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
