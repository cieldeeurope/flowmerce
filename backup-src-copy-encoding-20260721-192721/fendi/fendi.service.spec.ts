import { Test, TestingModule } from '@nestjs/testing';
import { FendiService } from './fendi.service';

describe('FendiService', () => {
  let service: FendiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FendiService],
    }).compile();

    service = module.get<FendiService>(FendiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
