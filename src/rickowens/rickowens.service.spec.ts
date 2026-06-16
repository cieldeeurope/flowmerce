import { Test, TestingModule } from '@nestjs/testing';
import { RickowensService } from './rickowens.service';

describe('RickowensService', () => {
  let service: RickowensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RickowensService],
    }).compile();

    service = module.get<RickowensService>(RickowensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
