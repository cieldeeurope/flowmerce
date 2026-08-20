import { Test, TestingModule } from '@nestjs/testing';
import { JimmychooService } from './jimmychoo.service';

describe('JimmychooService', () => {
  let service: JimmychooService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JimmychooService],
    }).compile();

    service = module.get<JimmychooService>(JimmychooService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
