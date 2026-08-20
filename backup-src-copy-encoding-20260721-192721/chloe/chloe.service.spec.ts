import { Test, TestingModule } from '@nestjs/testing';
import { ChloeService } from './chloe.service';

describe('ChloeService', () => {
  let service: ChloeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChloeService],
    }).compile();

    service = module.get<ChloeService>(ChloeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
