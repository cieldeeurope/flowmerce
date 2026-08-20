import { Test, TestingModule } from '@nestjs/testing';
import { BalenciagaController } from './balenciaga.controller';
import { BalenciagaService } from './balenciaga.service';

describe('BalenciagaController', () => {
  let controller: BalenciagaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalenciagaController],
      providers: [BalenciagaService],
    }).compile();

    controller = module.get<BalenciagaController>(BalenciagaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
