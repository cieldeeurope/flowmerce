import { Test, TestingModule } from '@nestjs/testing';
import { RogervivierController } from './rogervivier.controller';
import { RogervivierService } from './rogervivier.service';

describe('RogervivierController', () => {
  let controller: RogervivierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RogervivierController],
      providers: [RogervivierService],
    }).compile();

    controller = module.get<RogervivierController>(RogervivierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
