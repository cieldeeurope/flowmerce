import { Test, TestingModule } from '@nestjs/testing';
import { TomfordController } from './tomford.controller';
import { TomfordService } from './tomford.service';

describe('TomfordController', () => {
  let controller: TomfordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TomfordController],
      providers: [TomfordService],
    }).compile();

    controller = module.get<TomfordController>(TomfordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
