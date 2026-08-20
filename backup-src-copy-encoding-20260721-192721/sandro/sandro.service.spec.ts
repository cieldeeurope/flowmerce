import { Test, TestingModule } from '@nestjs/testing';
import { SandroService } from './sandro.service';

describe('SandroService', () => {
  let service: SandroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SandroService],
    }).compile();

    service = module.get<SandroService>(SandroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
