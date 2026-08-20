import { Test, TestingModule } from '@nestjs/testing';
import { MakeshopController } from './makeshop.controller';
import { MakeshopService } from './makeshop.service';

describe('MakeshopController', () => {
  let controller: MakeshopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MakeshopController],
      providers: [MakeshopService],
    }).compile();

    controller = module.get<MakeshopController>(MakeshopController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
