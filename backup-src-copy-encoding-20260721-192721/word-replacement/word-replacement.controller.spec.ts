import { Test, TestingModule } from '@nestjs/testing';
import { WordReplacementController } from './word-replacement.controller';
import { WordReplacementService } from './word-replacement.service';

describe('WordReplacementController', () => {
  let controller: WordReplacementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordReplacementController],
      providers: [WordReplacementService],
    }).compile();

    controller = module.get<WordReplacementController>(WordReplacementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
