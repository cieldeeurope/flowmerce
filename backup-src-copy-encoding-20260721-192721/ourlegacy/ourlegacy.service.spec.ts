import { Test, TestingModule } from '@nestjs/testing';
import { OurlegacyService } from './ourlegacy.service';

describe('OurlegacyService', () => {
  let service: OurlegacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OurlegacyService],
    }).compile();

    service = module.get<OurlegacyService>(OurlegacyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
