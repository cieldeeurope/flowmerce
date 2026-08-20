import { Test, TestingModule } from '@nestjs/testing';
import { LoeweController } from './loewe.controller';
import { LoeweService } from './loewe.service';

describe('LoeweController', () => {
  let controller: LoeweController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoeweController],
      providers: [LoeweService],
    }).compile();

    controller = module.get<LoeweController>(LoeweController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
