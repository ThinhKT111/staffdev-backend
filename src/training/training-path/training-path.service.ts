// src/training/training-path/training-path.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingPath, DurationType } from '../../entities/training-path.entity';
import { CreateTrainingPathDto } from './dto/create-training-path.dto';
import { UpdateTrainingPathDto } from './dto/update-training-path.dto';

@Injectable()
export class TrainingPathService {
  constructor(
    @InjectRepository(TrainingPath)
    private trainingPathRepository: Repository<TrainingPath>,
  ) {}

  async findAll(): Promise<TrainingPath[]> {
    return this.trainingPathRepository.find({
      relations: ['department', 'creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<TrainingPath> {
    const path = await this.trainingPathRepository.findOne({
      where: { training_path_id: id },
      relations: ['department', 'creator'],
    });
    
    if (!path) {
      throw new NotFoundException(`Training path with ID ${id} not found`);
    }
    
    return path;
  }

  async create(createTrainingPathDto: CreateTrainingPathDto): Promise<TrainingPath> {
    // Map duration string to enum
    let duration: DurationType;
    if (createTrainingPathDto.duration === 'ShortTerm') {
      duration = DurationType.SHORT_TERM;
    } else if (createTrainingPathDto.duration === 'LongTerm') {
      duration = DurationType.LONG_TERM;
    } else {
      duration = DurationType.SHORT_TERM; // Default
    }

    const path = this.trainingPathRepository.create({
      title: createTrainingPathDto.title,
      description: createTrainingPathDto.description,
      department_id: createTrainingPathDto.departmentId,
      duration: duration,
      created_by: createTrainingPathDto.createdBy,
      total_courses: createTrainingPathDto.totalCourses || 0,
      duration_in_weeks: createTrainingPathDto.durationInWeeks,
      is_active: createTrainingPathDto.isActive !== undefined ? createTrainingPathDto.isActive : true,
      created_at: new Date(),
    });
    
    return this.trainingPathRepository.save(path);
  }

  async update(id: number, updateTrainingPathDto: UpdateTrainingPathDto): Promise<TrainingPath> {
    const path = await this.findOne(id);
    
    // Map duration string to enum if provided
    let duration = path.duration;
    if (updateTrainingPathDto.duration) {
      if (updateTrainingPathDto.duration === 'ShortTerm') {
        duration = DurationType.SHORT_TERM;
      } else if (updateTrainingPathDto.duration === 'LongTerm') {
        duration = DurationType.LONG_TERM;
      }
    }
    
    // Update path
    Object.assign(path, {
      title: updateTrainingPathDto.title || path.title,
      description: updateTrainingPathDto.description || path.description,
      department_id: updateTrainingPathDto.departmentId !== undefined ? updateTrainingPathDto.departmentId : path.department_id,
      duration: duration,
      total_courses: updateTrainingPathDto.totalCourses !== undefined ? updateTrainingPathDto.totalCourses : path.total_courses,
      duration_in_weeks: updateTrainingPathDto.durationInWeeks !== undefined ? updateTrainingPathDto.durationInWeeks : path.duration_in_weeks,
      is_active: updateTrainingPathDto.isActive !== undefined ? updateTrainingPathDto.isActive : path.is_active,
    });
    
    return this.trainingPathRepository.save(path);
  }

  async remove(id: number): Promise<void> {
    const path = await this.findOne(id);
    await this.trainingPathRepository.remove(path);
  }
}