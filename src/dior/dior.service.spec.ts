import { Test, TestingModule } from '@nestjs/testing';
import { DiorService } from './dior.service';

describe('DiorService', () => {
  let service: DiorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiorService],
    }).compile();

    service = module.get<DiorService>(DiorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
