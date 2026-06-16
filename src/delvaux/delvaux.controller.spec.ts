import { Test, TestingModule } from '@nestjs/testing';
import { DelvauxController } from './delvaux.controller';
import { DelvauxService } from './delvaux.service';

describe('DelvauxController', () => {
  let controller: DelvauxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DelvauxController],
      providers: [DelvauxService],
    }).compile();

    controller = module.get<DelvauxController>(DelvauxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
