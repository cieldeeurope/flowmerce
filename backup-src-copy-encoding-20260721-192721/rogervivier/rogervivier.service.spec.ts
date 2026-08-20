import { Test, TestingModule } from '@nestjs/testing';
import { RogervivierService } from './rogervivier.service';

describe('RogervivierService', () => {
  let service: RogervivierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RogervivierService],
    }).compile();

    service = module.get<RogervivierService>(RogervivierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
