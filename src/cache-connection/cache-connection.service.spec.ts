import { Test, TestingModule } from '@nestjs/testing';
import { CacheConnectionService } from './cache-connection.service';

describe('CacheConnectionService', () => {
  let service: CacheConnectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheConnectionService],
    }).compile();

    service = module.get<CacheConnectionService>(CacheConnectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
