import { Test, TestingModule } from '@nestjs/testing';
import { ValentinoController } from './valentino.controller';
import { ValentinoService } from './valentino.service';

describe('ValentinoController', () => {
  let controller: ValentinoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValentinoController],
      providers: [ValentinoService],
    }).compile();

    controller = module.get<ValentinoController>(ValentinoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
