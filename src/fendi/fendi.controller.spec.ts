import { Test, TestingModule } from '@nestjs/testing';
import { FendiController } from './fendi.controller';
import { FendiService } from './fendi.service';

describe('FendiController', () => {
  let controller: FendiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FendiController],
      providers: [FendiService],
    }).compile();

    controller = module.get<FendiController>(FendiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
