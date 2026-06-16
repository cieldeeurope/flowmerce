import { Test, TestingModule } from '@nestjs/testing';
import { AmiController } from './ami.controller';
import { AmiService } from './ami.service';

describe('AmiController', () => {
  let controller: AmiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmiController],
      providers: [AmiService],
    }).compile();

    controller = module.get<AmiController>(AmiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
