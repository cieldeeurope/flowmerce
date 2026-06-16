import { Test, TestingModule } from '@nestjs/testing';
import { CpcompanyController } from './cpcompany.controller';
import { CpcompanyService } from './cpcompany.service';

describe('CpcompanyController', () => {
  let controller: CpcompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CpcompanyController],
      providers: [CpcompanyService],
    }).compile();

    controller = module.get<CpcompanyController>(CpcompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
