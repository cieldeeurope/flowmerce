import { Test, TestingModule } from '@nestjs/testing';
import { HernoService } from './herno.service';

describe('HernoService', () => {
  let service: HernoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HernoService],
    }).compile();

    service = module.get<HernoService>(HernoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
