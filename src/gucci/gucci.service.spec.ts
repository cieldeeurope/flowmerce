import { Test, TestingModule } from '@nestjs/testing';
import { GucciService } from './gucci.service';

describe('GucciService', () => {
  let service: GucciService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GucciService],
    }).compile();

    service = module.get<GucciService>(GucciService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
