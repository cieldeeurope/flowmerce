import { Test, TestingModule } from '@nestjs/testing';
import { RickowensController } from './rickowens.controller';
import { RickowensService } from './rickowens.service';

describe('RickowensController', () => {
  let controller: RickowensController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RickowensController],
      providers: [RickowensService],
    }).compile();

    controller = module.get<RickowensController>(RickowensController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
