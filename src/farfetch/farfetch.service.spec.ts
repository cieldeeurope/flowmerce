import { Test, TestingModule } from '@nestjs/testing';
import { FarfetchService } from './farfetch.service';

describe('FarfetchService', () => {
  let service: FarfetchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarfetchService],
    }).compile();

    service = module.get<FarfetchService>(FarfetchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
