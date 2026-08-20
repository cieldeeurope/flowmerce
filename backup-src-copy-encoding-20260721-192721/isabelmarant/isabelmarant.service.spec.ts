import { Test, TestingModule } from '@nestjs/testing';
import { IsabelmarantService } from './isabelmarant.service';

describe('IsabelmarantService', () => {
  let service: IsabelmarantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IsabelmarantService],
    }).compile();

    service = module.get<IsabelmarantService>(IsabelmarantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
