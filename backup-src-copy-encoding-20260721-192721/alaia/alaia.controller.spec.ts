import { Test, TestingModule } from '@nestjs/testing';
import { AlaiaController } from './alaia.controller';
import { AlaiaService } from './alaia.service';

describe('AlaiaController', () => {
  let controller: AlaiaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlaiaController],
      providers: [AlaiaService],
    }).compile();

    controller = module.get<AlaiaController>(AlaiaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
