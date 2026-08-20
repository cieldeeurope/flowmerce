import { Test, TestingModule } from '@nestjs/testing';
import { OurlegacyController } from './ourlegacy.controller';
import { OurlegacyService } from './ourlegacy.service';

describe('OurlegacyController', () => {
  let controller: OurlegacyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OurlegacyController],
      providers: [OurlegacyService],
    }).compile();

    controller = module.get<OurlegacyController>(OurlegacyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
