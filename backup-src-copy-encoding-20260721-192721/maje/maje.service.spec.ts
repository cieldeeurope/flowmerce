import { Test, TestingModule } from '@nestjs/testing';
import { MajeService } from './maje.service';

describe('MajeService', () => {
  let service: MajeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MajeService],
    }).compile();

    service = module.get<MajeService>(MajeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
