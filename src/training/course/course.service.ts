// src/training/course/course.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
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
    const course = this.courseRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      training_path_id: createCourseDto.trainingPathId,
      type: createCourseDto.type,
      duration_hours: createCourseDto.durationHours,
      level: createCourseDto.level,
      total_lessons: createCourseDto.totalLessons || 0,
      is_active: createCourseDto.isActive !== undefined ? createCourseDto.isActive : true,
      created_at: new Date(),
    });
    
    return this.courseRepository.save(course);
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    
    // Update course
    const updatedCourse = {
      ...course,
      title: updateCourseDto.title || course.title,
      description: updateCourseDto.description || course.description,
      training_path_id: updateCourseDto.trainingPathId || course.training_path_id,
      type: updateCourseDto.type || course.type,
      duration_hours: updateCourseDto.durationHours !== undefined ? updateCourseDto.durationHours : course.duration_hours,
      level: updateCourseDto.level || course.level,
      total_lessons: updateCourseDto.totalLessons !== undefined ? updateCourseDto.totalLessons : course.total_lessons,
      is_active: updateCourseDto.isActive !== undefined ? updateCourseDto.isActive : course.is_active,
    };
    
    return this.courseRepository.save(updatedCourse);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}