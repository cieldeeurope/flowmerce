import { Test, TestingModule } from '@nestjs/testing';
import { GivenchyService } from './givenchy.service';

describe('GivenchyService', () => {
  let service: GivenchyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GivenchyService],
    }).compile();

    service = module.get<GivenchyService>(GivenchyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
