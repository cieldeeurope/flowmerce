import { Test, TestingModule } from '@nestjs/testing';
import { FerragamoService } from './ferragamo.service';

describe('FerragamoService', () => {
  let service: FerragamoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FerragamoService],
    }).compile();

    service = module.get<FerragamoService>(FerragamoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
