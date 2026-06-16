import { Test, TestingModule } from '@nestjs/testing';
import { MaisonkitsuneService } from './maisonkitsune.service';

describe('MaisonkitsuneService', () => {
  let service: MaisonkitsuneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaisonkitsuneService],
    }).compile();

    service = module.get<MaisonkitsuneService>(MaisonkitsuneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
