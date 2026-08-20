import { Test, TestingModule } from '@nestjs/testing';
import { MiumiuService } from './miumiu.service';

describe('MiumiuService', () => {
  let service: MiumiuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MiumiuService],
    }).compile();

    service = module.get<MiumiuService>(MiumiuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
