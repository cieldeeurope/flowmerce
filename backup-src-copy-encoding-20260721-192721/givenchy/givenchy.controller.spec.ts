import { Test, TestingModule } from '@nestjs/testing';
import { GivenchyController } from './givenchy.controller';
import { GivenchyService } from './givenchy.service';

describe('GivenchyController', () => {
  let controller: GivenchyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GivenchyController],
      providers: [GivenchyService],
    }).compile();

    controller = module.get<GivenchyController>(GivenchyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
