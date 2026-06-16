import { Test, TestingModule } from '@nestjs/testing';
import { TotemeController } from './toteme.controller';
import { TotemeService } from './toteme.service';

describe('TotemeController', () => {
  let controller: TotemeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TotemeController],
      providers: [TotemeService],
    }).compile();

    controller = module.get<TotemeController>(TotemeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
