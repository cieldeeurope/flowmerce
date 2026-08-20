import { Test, TestingModule } from '@nestjs/testing';
import { ThombrowneService } from './thombrowne.service';

describe('ThombrowneService', () => {
  let service: ThombrowneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThombrowneService],
    }).compile();

    service = module.get<ThombrowneService>(ThombrowneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
