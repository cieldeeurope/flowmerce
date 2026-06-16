import { Test, TestingModule } from '@nestjs/testing';
import { TodsController } from './tods.controller';
import { TodsService } from './tods.service';

describe('TodsController', () => {
  let controller: TodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodsController],
      providers: [TodsService],
    }).compile();

    controller = module.get<TodsController>(TodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
