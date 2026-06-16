import { Test, TestingModule } from '@nestjs/testing';
import { MaisonmargielaService } from './maisonmargiela.service';

describe('MaisonmargielaService', () => {
  let service: MaisonmargielaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaisonmargielaService],
    }).compile();

    service = module.get<MaisonmargielaService>(MaisonmargielaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
