import { Test, TestingModule } from '@nestjs/testing';
import { BalenciagaService } from './balenciaga.service';

describe('BalenciagaService', () => {
  let service: BalenciagaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BalenciagaService],
    }).compile();

    service = module.get<BalenciagaService>(BalenciagaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
