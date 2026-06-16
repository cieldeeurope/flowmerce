import { Test, TestingModule } from '@nestjs/testing';
import { JilsanderController } from './jilsander.controller';
import { JilsanderService } from './jilsander.service';

describe('JilsanderController', () => {
  let controller: JilsanderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JilsanderController],
      providers: [JilsanderService],
    }).compile();

    controller = module.get<JilsanderController>(JilsanderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
