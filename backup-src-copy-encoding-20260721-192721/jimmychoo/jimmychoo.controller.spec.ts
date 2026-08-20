import { Test, TestingModule } from '@nestjs/testing';
import { JimmychooController } from './jimmychoo.controller';
import { JimmychooService } from './jimmychoo.service';

describe('JimmychooController', () => {
  let controller: JimmychooController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JimmychooController],
      providers: [JimmychooService],
    }).compile();

    controller = module.get<JimmychooController>(JimmychooController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
