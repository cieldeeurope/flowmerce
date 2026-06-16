import { Test, TestingModule } from '@nestjs/testing';
import { AlexanderController } from './alexander.controller';
import { AlexanderService } from './alexander.service';

describe('AlexanderController', () => {
  let controller: AlexanderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlexanderController],
      providers: [AlexanderService],
    }).compile();

    controller = module.get<AlexanderController>(AlexanderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
