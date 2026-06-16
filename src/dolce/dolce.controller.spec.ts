import { Test, TestingModule } from '@nestjs/testing';
import { DolceController } from './dolce.controller';
import { DolceService } from './dolce.service';

describe('DolceController', () => {
  let controller: DolceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DolceController],
      providers: [DolceService],
    }).compile();

    controller = module.get<DolceController>(DolceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
