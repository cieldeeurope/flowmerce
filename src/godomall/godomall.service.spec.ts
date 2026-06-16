import { Test, TestingModule } from '@nestjs/testing';
import { GodoMallService } from './godomall.service';

describe('GodoMallService', () => {
  let service: GodoMallService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GodoMallService],
    }).compile();

    service = module.get<GodoMallService>(GodoMallService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
