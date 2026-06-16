import { Test, TestingModule } from '@nestjs/testing';
import { SandroController } from './sandro.controller';
import { SandroService } from './sandro.service';

describe('SandroController', () => {
  let controller: SandroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SandroController],
      providers: [SandroService],
    }).compile();

    controller = module.get<SandroController>(SandroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
