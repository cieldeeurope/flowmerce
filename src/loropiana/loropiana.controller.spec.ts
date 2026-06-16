import { Test, TestingModule } from '@nestjs/testing';
import { LoropianaController } from './loropiana.controller';
import { LoropianaService } from './loropiana.service';

describe('LoropianaController', () => {
  let controller: LoropianaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoropianaController],
      providers: [LoropianaService],
    }).compile();

    controller = module.get<LoropianaController>(LoropianaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
