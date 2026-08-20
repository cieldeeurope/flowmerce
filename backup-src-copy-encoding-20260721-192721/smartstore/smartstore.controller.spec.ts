import { Test, TestingModule } from '@nestjs/testing';
import { SmartstoreController } from './smartstore.controller';
import { SmartstoreService } from './smartstore.service';

describe('SmartstoreController', () => {
  let controller: SmartstoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmartstoreController],
      providers: [SmartstoreService],
    }).compile();

    controller = module.get<SmartstoreController>(SmartstoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
