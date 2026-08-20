import { Test, TestingModule } from '@nestjs/testing';
import { LvController } from './lv.controller';
import { LvService } from './lv.service';

describe('LvController', () => {
  let controller: LvController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LvController],
      providers: [LvService],
    }).compile();

    controller = module.get<LvController>(LvController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
