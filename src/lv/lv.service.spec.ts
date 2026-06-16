import { Test, TestingModule } from '@nestjs/testing';
import { LvService } from './lv.service';

describe('LvService', () => {
  let service: LvService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LvService],
    }).compile();

    service = module.get<LvService>(LvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
