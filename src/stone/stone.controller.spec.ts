import { Test, TestingModule } from '@nestjs/testing';
import { StoneController } from './stone.controller';
import { StoneService } from './stone.service';

describe('StoneController', () => {
  let controller: StoneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoneController],
      providers: [StoneService],
    }).compile();

    controller = module.get<StoneController>(StoneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
