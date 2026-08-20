import { Test, TestingModule } from '@nestjs/testing';
import { PoleneController } from './polene.controller';
import { PoleneService } from './polene.service';

describe('PoleneController', () => {
  let controller: PoleneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoleneController],
      providers: [PoleneService],
    }).compile();

    controller = module.get<PoleneController>(PoleneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
