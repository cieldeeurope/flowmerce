import { Test, TestingModule } from '@nestjs/testing';
import { MonclerService } from './moncler.service';

describe('MonclerService', () => {
  let service: MonclerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonclerService],
    }).compile();

    service = module.get<MonclerService>(MonclerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
