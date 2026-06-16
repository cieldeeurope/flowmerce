import { Test, TestingModule } from '@nestjs/testing';
import { CettireController } from './cettire.controller';
import { CettireService } from './cettire.service';

describe('CettireController', () => {
  let controller: CettireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CettireController],
      providers: [CettireService],
    }).compile();

    controller = module.get<CettireController>(CettireController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
