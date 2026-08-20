import { Test, TestingModule } from '@nestjs/testing';
import { VersaceController } from './versace.controller';
import { VersaceService } from './versace.service';

describe('VersaceController', () => {
  let controller: VersaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersaceController],
      providers: [VersaceService],
    }).compile();

    controller = module.get<VersaceController>(VersaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
