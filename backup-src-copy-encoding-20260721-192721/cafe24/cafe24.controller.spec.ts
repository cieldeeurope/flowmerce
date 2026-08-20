import { Test, TestingModule } from '@nestjs/testing';
import { Cafe24Controller } from './cafe24.controller';
import { Cafe24Service } from './cafe24.service';

describe('Cafe24Controller', () => {
  let controller: Cafe24Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Cafe24Controller],
      providers: [Cafe24Service],
    }).compile();

    controller = module.get<Cafe24Controller>(Cafe24Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
