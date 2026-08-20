import { Test, TestingModule } from '@nestjs/testing';
import { ThombrowneController } from './thombrowne.controller';
import { ThombrowneService } from './thombrowne.service';

describe('ThombrowneController', () => {
  let controller: ThombrowneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThombrowneController],
      providers: [ThombrowneService],
    }).compile();

    controller = module.get<ThombrowneController>(ThombrowneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
