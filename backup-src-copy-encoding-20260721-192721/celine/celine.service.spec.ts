import { Test, TestingModule } from '@nestjs/testing';
import { CelineService } from './celine.service';

describe('CelineService', () => {
  let service: CelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CelineService],
    }).compile();

    service = module.get<CelineService>(CelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
