import { Test, TestingModule } from '@nestjs/testing';
import { DolceService } from './dolce.service';

describe('DolceService', () => {
  let service: DolceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DolceService],
    }).compile();

    service = module.get<DolceService>(DolceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
