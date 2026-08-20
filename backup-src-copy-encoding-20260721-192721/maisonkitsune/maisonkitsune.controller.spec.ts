import { Test, TestingModule } from '@nestjs/testing';
import { MaisonkitsuneController } from './maisonkitsune.controller';
import { MaisonkitsuneService } from './maisonkitsune.service';

describe('MaisonkitsuneController', () => {
  let controller: MaisonkitsuneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaisonkitsuneController],
      providers: [MaisonkitsuneService],
    }).compile();

    controller = module.get<MaisonkitsuneController>(MaisonkitsuneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
