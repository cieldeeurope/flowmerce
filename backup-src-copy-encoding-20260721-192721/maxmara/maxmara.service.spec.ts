import { Test, TestingModule } from '@nestjs/testing';
import { MaxmaraService } from './maxmara.service';

describe('MaxmaraService', () => {
  let service: MaxmaraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaxmaraService],
    }).compile();

    service = module.get<MaxmaraService>(MaxmaraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
