import { Test, TestingModule } from '@nestjs/testing';
import { GucciController } from './gucci.controller';
import { GucciService } from './gucci.service';

describe('GucciController', () => {
  let controller: GucciController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GucciController],
      providers: [GucciService],
    }).compile();

    controller = module.get<GucciController>(GucciController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
