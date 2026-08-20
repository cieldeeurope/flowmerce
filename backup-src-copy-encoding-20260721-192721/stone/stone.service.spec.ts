import { Test, TestingModule } from '@nestjs/testing';
import { StoneService } from './stone.service';

describe('StoneService', () => {
  let service: StoneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoneService],
    }).compile();

    service = module.get<StoneService>(StoneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
