import { Test, TestingModule } from '@nestjs/testing';
import { OffwhiteService } from './offwhite.service';

describe('OffwhiteService', () => {
  let service: OffwhiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OffwhiteService],
    }).compile();

    service = module.get<OffwhiteService>(OffwhiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
