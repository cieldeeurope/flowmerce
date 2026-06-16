import { Test, TestingModule } from '@nestjs/testing';
import { CpcompanyService } from './cpcompany.service';

describe('CpcompanyService', () => {
  let service: CpcompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CpcompanyService],
    }).compile();

    service = module.get<CpcompanyService>(CpcompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
