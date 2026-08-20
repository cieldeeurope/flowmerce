import { Test, TestingModule } from '@nestjs/testing';
import { MaxmaraController } from './maxmara.controller';
import { MaxmaraService } from './maxmara.service';

describe('MaxmaraController', () => {
  let controller: MaxmaraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaxmaraController],
      providers: [MaxmaraService],
    }).compile();

    controller = module.get<MaxmaraController>(MaxmaraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
