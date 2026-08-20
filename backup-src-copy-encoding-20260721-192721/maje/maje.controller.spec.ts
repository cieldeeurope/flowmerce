import { Test, TestingModule } from '@nestjs/testing';
import { MajeController } from './maje.controller';
import { MajeService } from './maje.service';

describe('MajeController', () => {
  let controller: MajeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MajeController],
      providers: [MajeService],
    }).compile();

    controller = module.get<MajeController>(MajeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
