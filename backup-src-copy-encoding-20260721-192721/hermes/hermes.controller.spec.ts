import { Test, TestingModule } from '@nestjs/testing';
import { HermesController } from './hermes.controller';
import { HermesService } from './hermes.service';

describe('HermesController', () => {
  let controller: HermesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HermesController],
      providers: [HermesService],
    }).compile();

    controller = module.get<HermesController>(HermesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
