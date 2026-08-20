import { Test, TestingModule } from '@nestjs/testing';
import { EtroController } from './etro.controller';
import { EtroService } from './etro.service';

describe('EtroController', () => {
  let controller: EtroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtroController],
      providers: [EtroService],
    }).compile();

    controller = module.get<EtroController>(EtroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
