import { Test, TestingModule } from '@nestjs/testing';
import { CettireService } from './cettire.service';

describe('CettireService', () => {
  let service: CettireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CettireService],
    }).compile();

    service = module.get<CettireService>(CettireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
