import { Test, TestingModule } from '@nestjs/testing';
import { EtroService } from './etro.service';

describe('EtroService', () => {
  let service: EtroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtroService],
    }).compile();

    service = module.get<EtroService>(EtroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
