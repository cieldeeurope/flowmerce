import { Test, TestingModule } from '@nestjs/testing';
import { FarfetchController } from './farfetch.controller';
import { FarfetchService } from './farfetch.service';

describe('FarfetchController', () => {
  let controller: FarfetchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FarfetchController],
      providers: [FarfetchService],
    }).compile();

    controller = module.get<FarfetchController>(FarfetchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
