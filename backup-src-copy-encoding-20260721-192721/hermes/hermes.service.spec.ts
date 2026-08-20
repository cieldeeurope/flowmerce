import { Test, TestingModule } from '@nestjs/testing';
import { HermesService } from './hermes.service';

describe('HermesService', () => {
  let service: HermesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HermesService],
    }).compile();

    service = module.get<HermesService>(HermesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
