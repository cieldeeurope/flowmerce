import { Test, TestingModule } from '@nestjs/testing';
import { LoeweService } from './loewe.service';

describe('LoeweService', () => {
  let service: LoeweService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoeweService],
    }).compile();

    service = module.get<LoeweService>(LoeweService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
