import { Test, TestingModule } from '@nestjs/testing';
import { ChloeController } from './chloe.controller';
import { ChloeService } from './chloe.service';

describe('ChloeController', () => {
  let controller: ChloeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChloeController],
      providers: [ChloeService],
    }).compile();

    controller = module.get<ChloeController>(ChloeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
