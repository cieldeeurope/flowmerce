import { Test, TestingModule } from '@nestjs/testing';
import { IsabelmarantController } from './isabelmarant.controller';
import { IsabelmarantService } from './isabelmarant.service';

describe('IsabelmarantController', () => {
  let controller: IsabelmarantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsabelmarantController],
      providers: [IsabelmarantService],
    }).compile();

    controller = module.get<IsabelmarantController>(IsabelmarantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
