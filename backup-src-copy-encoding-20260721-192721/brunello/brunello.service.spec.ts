import { Test, TestingModule } from '@nestjs/testing';
import { BrunelloService } from './brunello.service';

describe('BrunelloService', () => {
  let service: BrunelloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrunelloService],
    }).compile();

    service = module.get<BrunelloService>(BrunelloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
