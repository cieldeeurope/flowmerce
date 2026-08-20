import { Test, TestingModule } from '@nestjs/testing';
import { DelvauxService } from './delvaux.service';

describe('DelvauxService', () => {
  let service: DelvauxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DelvauxService],
    }).compile();

    service = module.get<DelvauxService>(DelvauxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
