import { Test, TestingModule } from '@nestjs/testing';
import { OffwhiteController } from './offwhite.controller';
import { OffwhiteService } from './offwhite.service';

describe('OffwhiteController', () => {
  let controller: OffwhiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffwhiteController],
      providers: [OffwhiteService],
    }).compile();

    controller = module.get<OffwhiteController>(OffwhiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
