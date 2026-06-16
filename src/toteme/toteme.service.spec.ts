import { Test, TestingModule } from '@nestjs/testing';
import { TotemeService } from './toteme.service';

describe('TotemeService', () => {
  let service: TotemeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TotemeService],
    }).compile();

    service = module.get<TotemeService>(TotemeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
