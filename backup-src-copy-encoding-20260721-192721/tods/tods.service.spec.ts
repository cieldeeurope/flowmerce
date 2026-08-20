import { Test, TestingModule } from '@nestjs/testing';
import { TodsService } from './tods.service';

describe('TodsService', () => {
  let service: TodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodsService],
    }).compile();

    service = module.get<TodsService>(TodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
