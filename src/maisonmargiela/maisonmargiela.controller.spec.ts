import { Test, TestingModule } from '@nestjs/testing';
import { MaisonmargielaController } from './maisonmargiela.controller';
import { MaisonmargielaService } from './maisonmargiela.service';

describe('MaisonmargielaController', () => {
  let controller: MaisonmargielaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaisonmargielaController],
      providers: [MaisonmargielaService],
    }).compile();

    controller = module.get<MaisonmargielaController>(MaisonmargielaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
