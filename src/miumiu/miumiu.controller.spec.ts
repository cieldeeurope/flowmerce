import { Test, TestingModule } from '@nestjs/testing';
import { MiumiuController } from './miumiu.controller';
import { MiumiuService } from './miumiu.service';

describe('MiumiuController', () => {
  let controller: MiumiuController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MiumiuController],
      providers: [MiumiuService],
    }).compile();

    controller = module.get<MiumiuController>(MiumiuController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
