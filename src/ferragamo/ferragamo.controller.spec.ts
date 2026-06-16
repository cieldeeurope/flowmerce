import { Test, TestingModule } from '@nestjs/testing';
import { FerragamoController } from './ferragamo.controller';
import { FerragamoService } from './ferragamo.service';

describe('FerragamoController', () => {
  let controller: FerragamoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FerragamoController],
      providers: [FerragamoService],
    }).compile();

    controller = module.get<FerragamoController>(FerragamoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
