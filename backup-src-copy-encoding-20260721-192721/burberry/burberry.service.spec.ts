import { Test, TestingModule } from '@nestjs/testing';
import { BurberryService } from './burberry.service';

describe('BurberryService', () => {
  let service: BurberryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BurberryService],
    }).compile();

    service = module.get<BurberryService>(BurberryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
