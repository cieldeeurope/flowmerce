import { Test, TestingModule } from '@nestjs/testing';
import { GodoMallController } from './godomall.controller';
import { GodoMallService } from './godomall.service';

describe('GodoMallController', () => {
  let controller: GodoMallController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GodoMallController],
      providers: [GodoMallService],
    }).compile();

    controller = module.get<GodoMallController>(GodoMallController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
