import { Test, TestingModule } from '@nestjs/testing';
import { VersaceService } from './versace.service';

describe('VersaceService', () => {
  let service: VersaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VersaceService],
    }).compile();

    service = module.get<VersaceService>(VersaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
