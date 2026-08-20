import { Test, TestingModule } from '@nestjs/testing';
import { AcneService } from './acne.service';

describe('AcneService', () => {
  let service: AcneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcneService],
    }).compile();

    service = module.get<AcneService>(AcneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
