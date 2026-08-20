import { Test, TestingModule } from '@nestjs/testing';
import { LongchampController } from './longchamp.controller';
import { LongchampService } from './longchamp.service';

describe('LongchampController', () => {
  let controller: LongchampController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LongchampController],
      providers: [LongchampService],
    }).compile();

    controller = module.get<LongchampController>(LongchampController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
