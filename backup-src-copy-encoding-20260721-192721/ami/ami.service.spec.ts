import { Test, TestingModule } from '@nestjs/testing';
import { AmiService } from './ami.service';

describe('AmiService', () => {
  let service: AmiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmiService],
    }).compile();

    service = module.get<AmiService>(AmiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
