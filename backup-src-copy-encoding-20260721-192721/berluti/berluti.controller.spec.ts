import { Test, TestingModule } from '@nestjs/testing';
import { BerlutiController } from './berluti.controller';
import { BerlutiService } from './berluti.service';

describe('BerlutiController', () => {
  let controller: BerlutiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BerlutiController],
      providers: [BerlutiService],
    }).compile();

    controller = module.get<BerlutiController>(BerlutiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
