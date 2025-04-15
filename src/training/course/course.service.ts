// src/training/course/course.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseType, CourseLevel } from '../../entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Course[]> {
    return this.courseRepository.find({
      relations: ['trainingPath'],
      order: { created_at: 'DESC' },
    });
  }

  async findByTrainingPath(trainingPathId: number): Promise<Course[]> {
    return this.courseRepository.find({
      where: { training_path_id: trainingPathId },
      relations: ['trainingPath'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { course_id: id },
      relations: ['trainingPath'],
    });
    
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    
    return course;
  }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    // Map type string to enum
    let type: CourseType;
    switch (createCourseDto.type) {
      case 'Online':
        type = CourseType.ONLINE;
        break;
      case 'Offline':
        type = CourseType.OFFLINE;
        break;
      case 'Video':
        type = CourseType.VIDEO;
        break;
      case 'Document':
        type = CourseType.DOCUMENT;
        break;
      default:
        type = CourseType.ONLINE; // Default
    }

    // Map level string to enum if provided
    let level: CourseLevel | undefined;
    if (createCourseDto.level) {
      switch (createCourseDto.level) {
        case 'beginner':
          level = CourseLevel.BEGINNER;
          break;
        case 'intermediate':
          level = CourseLevel.INTERMEDIATE;
          break;
        case 'advanced':
          level = CourseLevel.ADVANCED;
          break;
      }
    }

    const course = this.courseRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      training_path_id: createCourseDto.trainingPathId,
      type: type,
      duration_hours: createCourseDto.durationHours,
      level: level,
      total_lessons: createCourseDto.totalLessons || 0,
      is_active: createCourseDto.isActive !== undefined ? createCourseDto.isActive : true,
      created_at: new Date(),
    });
    
    return this.courseRepository.save(course);
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    
    // Map type string to enum if provided
    let type = course.type;
    if (updateCourseDto.type) {
      switch (updateCourseDto.type) {
        case 'Online':
          type = CourseType.ONLINE;
          break;
        case 'Offline':
          type = CourseType.OFFLINE;
          break;
        case 'Video':
          type = CourseType.VIDEO;
          break;
        case 'Document':
          type = CourseType.DOCUMENT;
          break;
      }
    }

    // Map level string to enum if provided
    let level = course.level;
    if (updateCourseDto.level) {
      switch (updateCourseDto.level) {
        case 'beginner':
          level = CourseLevel.BEGINNER;
          break;
        case 'intermediate':
          level = CourseLevel.INTERMEDIATE;
          break;
        case 'advanced':
          level = CourseLevel.ADVANCED;
          break;
      }
    }
    
    // Update course
    Object.assign(course, {
      title: updateCourseDto.title || course.title,
      description: updateCourseDto.description || course.description,
      training_path_id: updateCourseDto.trainingPathId || course.training_path_id,
      type: type,
      duration_hours: updateCourseDto.durationHours !== undefined ? updateCourseDto.durationHours : course.duration_hours,
      level: level,
      total_lessons: updateCourseDto.totalLessons !== undefined ? updateCourseDto.totalLessons : course.total_lessons,
      is_active: updateCourseDto.isActive !== undefined ? updateCourseDto.isActive : course.is_active,
    });
    
    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}