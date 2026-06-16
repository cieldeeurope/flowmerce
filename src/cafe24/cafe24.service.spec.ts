import { Test, TestingModule } from '@nestjs/testing';
import { Cafe24Service } from './cafe24.service';

describe('Cafe24Service', () => {
  let service: Cafe24Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Cafe24Service],
    }).compile();

    service = module.get<Cafe24Service>(Cafe24Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
