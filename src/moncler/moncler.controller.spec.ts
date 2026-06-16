import { Test, TestingModule } from '@nestjs/testing';
import { MonclerController } from './moncler.controller';
import { MonclerService } from './moncler.service';

describe('MonclerController', () => {
  let controller: MonclerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonclerController],
      providers: [MonclerService],
    }).compile();

    controller = module.get<MonclerController>(MonclerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
