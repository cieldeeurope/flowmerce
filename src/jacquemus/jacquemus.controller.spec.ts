import { Test, TestingModule } from '@nestjs/testing';
import { JacquemusController } from './jacquemus.controller';
import { JacquemusService } from './jacquemus.service';

describe('JacquemusController', () => {
  let controller: JacquemusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JacquemusController],
      providers: [JacquemusService],
    }).compile();

    controller = module.get<JacquemusController>(JacquemusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
