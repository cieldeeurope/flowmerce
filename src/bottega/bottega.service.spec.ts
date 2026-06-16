import { Test, TestingModule } from '@nestjs/testing';
import { BottegaService } from './bottega.service';

describe('BottegaService', () => {
  let service: BottegaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BottegaService],
    }).compile();

    service = module.get<BottegaService>(BottegaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
