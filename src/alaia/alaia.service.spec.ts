import { Test, TestingModule } from '@nestjs/testing';
import { AlaiaService } from './alaia.service';

describe('AlaiaService', () => {
  let service: AlaiaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlaiaService],
    }).compile();

    service = module.get<AlaiaService>(AlaiaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
