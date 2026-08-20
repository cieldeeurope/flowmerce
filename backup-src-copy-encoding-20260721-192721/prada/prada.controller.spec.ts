import { Test, TestingModule } from '@nestjs/testing';
import { PradaController } from './prada.controller';
import { PradaService } from './prada.service';

describe('PradaController', () => {
  let controller: PradaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PradaController],
      providers: [PradaService],
    }).compile();

    controller = module.get<PradaController>(PradaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
