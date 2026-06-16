import { Test, TestingModule } from '@nestjs/testing';
import { PoleneService } from './polene.service';

describe('PoleneService', () => {
  let service: PoleneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoleneService],
    }).compile();

    service = module.get<PoleneService>(PoleneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
