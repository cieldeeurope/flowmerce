import { Test, TestingModule } from '@nestjs/testing';
import { BurberryController } from './burberry.controller';
import { BurberryService } from './burberry.service';

describe('BurberryController', () => {
  let controller: BurberryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BurberryController],
      providers: [BurberryService],
    }).compile();

    controller = module.get<BurberryController>(BurberryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
