import { Test, TestingModule } from '@nestjs/testing';
import { ApcService } from './apc.service';

describe('ApcService', () => {
  let service: ApcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApcService],
    }).compile();

    service = module.get<ApcService>(ApcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
