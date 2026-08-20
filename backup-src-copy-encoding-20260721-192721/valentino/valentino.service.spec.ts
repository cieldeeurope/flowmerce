import { Test, TestingModule } from '@nestjs/testing';
import { ValentinoService } from './valentino.service';

describe('ValentinoService', () => {
  let service: ValentinoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValentinoService],
    }).compile();

    service = module.get<ValentinoService>(ValentinoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
