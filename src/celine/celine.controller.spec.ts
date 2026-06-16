import { Test, TestingModule } from '@nestjs/testing';
import { CelineController } from './celine.controller';
import { CelineService } from './celine.service';

describe('CelineController', () => {
  let controller: CelineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CelineController],
      providers: [CelineService],
    }).compile();

    controller = module.get<CelineController>(CelineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
