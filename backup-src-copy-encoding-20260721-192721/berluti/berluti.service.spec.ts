import { Test, TestingModule } from '@nestjs/testing';
import { BerlutiService } from './berluti.service';

describe('BerlutiService', () => {
  let service: BerlutiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BerlutiService],
    }).compile();

    service = module.get<BerlutiService>(BerlutiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
