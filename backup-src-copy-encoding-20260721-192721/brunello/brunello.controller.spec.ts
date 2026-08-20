import { Test, TestingModule } from '@nestjs/testing';
import { BrunelloController } from './brunello.controller';
import { BrunelloService } from './brunello.service';

describe('BrunelloController', () => {
  let controller: BrunelloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrunelloController],
      providers: [BrunelloService],
    }).compile();

    controller = module.get<BrunelloController>(BrunelloController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
