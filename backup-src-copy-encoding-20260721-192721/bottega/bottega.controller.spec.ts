import { Test, TestingModule } from '@nestjs/testing';
import { BottegaController } from './bottega.controller';
import { BottegaService } from './bottega.service';

describe('BottegaController', () => {
  let controller: BottegaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BottegaController],
      providers: [BottegaService],
    }).compile();

    controller = module.get<BottegaController>(BottegaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
