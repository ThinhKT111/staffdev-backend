// src/user-courses/user-courses.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCourse, CourseStatus } from '../entities/user-course.entity';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class UserCoursesService {
  constructor(
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
  ) {}

  async findAll(): Promise<UserCourse[]> {
    return this.userCourseRepository.find({
      relations: ['user', 'course'],
    });
  }

  async findByUser(userId: number): Promise<UserCourse[]> {
    return this.userCourseRepository.find({
      where: { user_id: userId },
      relations: ['user', 'course'],
    });
  }

  async findByCourse(courseId: number): Promise<UserCourse[]> {
    return this.userCourseRepository.find({
      where: { course_id: courseId },
      relations: ['user', 'course'],
    });
  }

  async findOne(id: number): Promise<UserCourse> {
    const userCourse = await this.userCourseRepository.findOne({
      where: { user_course_id: id },
      relations: ['user', 'course'],
    });
    
    if (!userCourse) {
      throw new NotFoundException(`User course with ID ${id} not found`);
    }
    
    return userCourse;
  }

  async findByUserAndCourse(userId: number, courseId: number): Promise<UserCourse | undefined> {
    const userCourse = await this.userCourseRepository.findOne({
      where: { user_id: userId, course_id: courseId },
      relations: ['user', 'course'],
    });
    
    return userCourse || undefined;
  }

  async enrollCourse(enrollCourseDto: EnrollCourseDto): Promise<UserCourse> {
    // Check if already enrolled
    const existing = await this.findByUserAndCourse(
      enrollCourseDto.userId,
      enrollCourseDto.courseId
    );
    
    if (existing) {
      throw new ConflictException('User is already enrolled in this course');
    }
    
    // Create new enrollment
    const userCourse = this.userCourseRepository.create({
      user_id: enrollCourseDto.userId,
      course_id: enrollCourseDto.courseId,
      status: CourseStatus.NOT_STARTED,
    });
    
    return this.userCourseRepository.save(userCourse);
  }

  async updateProgress(
    userId: number, 
    courseId: number, 
    updateProgressDto: UpdateProgressDto
  ): Promise<UserCourse> {
    // Find enrollment
    const userCourse = await this.findByUserAndCourse(userId, courseId);
    
    if (!userCourse) {
      throw new NotFoundException('User is not enrolled in this course');
    }
    
    // Map status string to enum
    let status: CourseStatus;
    switch (updateProgressDto.status) {
      case 'NotStarted':
        status = CourseStatus.NOT_STARTED;
        break;
      case 'InProgress':
        status = CourseStatus.IN_PROGRESS;
        break;
      case 'Completed':
        status = CourseStatus.COMPLETED;
        break;
      default:
        status = userCourse.status;
    }
    
    // Update progress
    Object.assign(userCourse, {
      status: status,
      completion_date: updateProgressDto.completionDate ? new Date(updateProgressDto.completionDate) : userCourse.completion_date,
      score: updateProgressDto.score !== undefined ? updateProgressDto.score : userCourse.score,
    });
    
    return this.userCourseRepository.save(userCourse);
  }

  async removeCourse(userId: number, courseId: number): Promise<void> {
    const userCourse = await this.findByUserAndCourse(userId, courseId);
    
    if (!userCourse) {
      throw new NotFoundException('User is not enrolled in this course');
    }
    
    await this.userCourseRepository.remove(userCourse);
  }

  async getEnrollmentStatistics(courseId: number): Promise<any> {
    const enrollments = await this.findByCourse(courseId);
    
    // Calculate statistics
    const totalEnrollments = enrollments.length;
    const notStarted = enrollments.filter(e => e.status === CourseStatus.NOT_STARTED).length;
    const inProgress = enrollments.filter(e => e.status === CourseStatus.IN_PROGRESS).length;
    const completed = enrollments.filter(e => e.status === CourseStatus.COMPLETED).length;
    
    // Calculate average score (only for completed courses)
    const completedCourses = enrollments.filter(e => e.status === CourseStatus.COMPLETED && e.score !== null);
    const averageScore = completedCourses.length > 0
      ? completedCourses.reduce((sum, e) => sum + (e.score || 0), 0) / completedCourses.length
      : 0;
    
    return {
      totalEnrollments,
      notStarted,
      inProgress,
      completed,
      completionRate: totalEnrollments > 0 ? (completed / totalEnrollments) * 100 : 0,
      averageScore: Math.round(averageScore * 100) / 100,
    };
  }
}