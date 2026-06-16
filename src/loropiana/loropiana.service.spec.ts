import { Test, TestingModule } from '@nestjs/testing';
import { LoropianaService } from './loropiana.service';

describe('LoropianaService', () => {
  let service: LoropianaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoropianaService],
    }).compile();

    service = module.get<LoropianaService>(LoropianaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
