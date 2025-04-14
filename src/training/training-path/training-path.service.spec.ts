import { Test, TestingModule } from '@nestjs/testing';
import { TrainingPathService } from './training-path.service';

describe('TrainingPathService', () => {
  let service: TrainingPathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingPathService],
    }).compile();

    service = module.get<TrainingPathService>(TrainingPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
