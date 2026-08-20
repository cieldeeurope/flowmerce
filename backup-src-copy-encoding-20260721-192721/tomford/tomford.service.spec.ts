import { Test, TestingModule } from '@nestjs/testing';
import { TomfordService } from './tomford.service';

describe('TomfordService', () => {
  let service: TomfordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TomfordService],
    }).compile();

    service = module.get<TomfordService>(TomfordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
