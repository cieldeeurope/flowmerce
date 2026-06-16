import { Test, TestingModule } from '@nestjs/testing';
import { JilsanderService } from './jilsander.service';

describe('JilsanderService', () => {
  let service: JilsanderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JilsanderService],
    }).compile();

    service = module.get<JilsanderService>(JilsanderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
