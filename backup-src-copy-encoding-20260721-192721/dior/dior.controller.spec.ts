import { Test, TestingModule } from '@nestjs/testing';
import { DiorController } from './dior.controller';
import { DiorService } from './dior.service';

describe('DiorController', () => {
  let controller: DiorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiorController],
      providers: [DiorService],
    }).compile();

    controller = module.get<DiorController>(DiorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
