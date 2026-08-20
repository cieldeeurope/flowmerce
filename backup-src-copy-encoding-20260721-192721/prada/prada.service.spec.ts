import { Test, TestingModule } from '@nestjs/testing';
import { PradaService } from './prada.service';

describe('PradaService', () => {
  let service: PradaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PradaService],
    }).compile();

    service = module.get<PradaService>(PradaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
