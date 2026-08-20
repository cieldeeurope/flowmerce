import { Test, TestingModule } from '@nestjs/testing';
import { TherowService } from './therow.service';

describe('TherowService', () => {
  let service: TherowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TherowService],
    }).compile();

    service = module.get<TherowService>(TherowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
