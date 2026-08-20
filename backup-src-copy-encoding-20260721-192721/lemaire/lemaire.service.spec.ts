import { Test, TestingModule } from '@nestjs/testing';
import { LemaireService } from './lemaire.service';

describe('LemaireService', () => {
  let service: LemaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LemaireService],
    }).compile();

    service = module.get<LemaireService>(LemaireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
