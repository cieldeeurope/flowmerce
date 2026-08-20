import { Test, TestingModule } from '@nestjs/testing';
import { SmartstoreService } from './smartstore.service';

describe('SmartstoreService', () => {
  let service: SmartstoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartstoreService],
    }).compile();

    service = module.get<SmartstoreService>(SmartstoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
