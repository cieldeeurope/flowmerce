import { Test, TestingModule } from '@nestjs/testing';
import { MakeshopService } from './makeshop.service';

describe('MakeshopService', () => {
  let service: MakeshopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MakeshopService],
    }).compile();

    service = module.get<MakeshopService>(MakeshopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
