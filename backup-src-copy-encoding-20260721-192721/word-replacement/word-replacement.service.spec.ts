import { Test, TestingModule } from '@nestjs/testing';
import { WordReplacementService } from './word-replacement.service';

describe('WordReplacementService', () => {
  let service: WordReplacementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordReplacementService],
    }).compile();

    service = module.get<WordReplacementService>(WordReplacementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
