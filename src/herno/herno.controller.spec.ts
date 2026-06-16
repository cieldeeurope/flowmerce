import { Test, TestingModule } from '@nestjs/testing';
import { HernoController } from './herno.controller';
import { HernoService } from './herno.service';

describe('HernoController', () => {
  let controller: HernoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HernoController],
      providers: [HernoService],
    }).compile();

    controller = module.get<HernoController>(HernoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
