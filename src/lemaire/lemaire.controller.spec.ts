import { Test, TestingModule } from '@nestjs/testing';
import { LemaireController } from './lemaire.controller';
import { LemaireService } from './lemaire.service';

describe('LemaireController', () => {
  let controller: LemaireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LemaireController],
      providers: [LemaireService],
    }).compile();

    controller = module.get<LemaireController>(LemaireController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
