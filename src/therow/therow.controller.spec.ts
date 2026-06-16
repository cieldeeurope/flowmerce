import { Test, TestingModule } from '@nestjs/testing';
import { TherowController } from './therow.controller';
import { TherowService } from './therow.service';

describe('TherowController', () => {
  let controller: TherowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TherowController],
      providers: [TherowService],
    }).compile();

    controller = module.get<TherowController>(TherowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
