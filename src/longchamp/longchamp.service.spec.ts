import { Test, TestingModule } from '@nestjs/testing';
import { LongchampService } from './longchamp.service';

describe('LongchampService', () => {
  let service: LongchampService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongchampService],
    }).compile();

    service = module.get<LongchampService>(LongchampService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
