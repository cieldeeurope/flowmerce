import { Test, TestingModule } from '@nestjs/testing';
import { JacquemusService } from './jacquemus.service';

describe('JacquemusService', () => {
  let service: JacquemusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JacquemusService],
    }).compile();

    service = module.get<JacquemusService>(JacquemusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
