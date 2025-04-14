import { Test, TestingModule } from '@nestjs/testing';
import { TrainingPathController } from './training-path.controller';

describe('TrainingPathController', () => {
  let controller: TrainingPathController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingPathController],
    }).compile();

    controller = module.get<TrainingPathController>(TrainingPathController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
