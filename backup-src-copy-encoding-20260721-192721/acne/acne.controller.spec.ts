import { Test, TestingModule } from '@nestjs/testing';
import { AcneController } from './acne.controller';
import { AcneService } from './acne.service';

describe('AcneController', () => {
  let controller: AcneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcneController],
      providers: [AcneService],
    }).compile();

    controller = module.get<AcneController>(AcneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
