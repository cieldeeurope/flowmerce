import { Test, TestingModule } from '@nestjs/testing';
import { AlexanderService } from './alexander.service';

describe('AlexanderService', () => {
  let service: AlexanderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlexanderService],
    }).compile();

    service = module.get<AlexanderService>(AlexanderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
