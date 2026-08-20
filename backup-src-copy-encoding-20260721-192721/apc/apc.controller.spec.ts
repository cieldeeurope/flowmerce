import { Test, TestingModule } from '@nestjs/testing';
import { ApcController } from './apc.controller';
import { ApcService } from './apc.service';

describe('ApcController', () => {
  let controller: ApcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApcController],
      providers: [ApcService],
    }).compile();

    controller = module.get<ApcController>(ApcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
