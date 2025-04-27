// src/user-courses/user-courses.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserCourse, CourseStatus } from '../entities/user-course.entity';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { Course } from '../entities/course.entity';
import { Attendance } from '../entities/attendance.entity';

@Injectable()
export class UserCoursesService {
  constructor(
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>
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

  async getUserLearningProgress(userId: number): Promise<any> {
    // Lấy tất cả các khóa học của người dùng
    const userCourses = await this.userCourseRepository.find({
      where: { user_id: userId },
      relations: ['course', 'course.trainingPath'],
    });
    
    // Tổng hợp theo lộ trình đào tạo
    const pathProgress = {};
    
    for (const userCourse of userCourses) {
      const trainingPathId = userCourse.course?.trainingPath?.training_path_id;
      const pathName = userCourse.course?.trainingPath?.title || 'Khóa học độc lập';
      
      if (!pathProgress[trainingPathId]) {
        pathProgress[trainingPathId] = {
          pathId: trainingPathId,
          pathName: pathName,
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          notStartedCourses: 0,
          averageScore: 0,
          totalScore: 0,
          courses: [],
        };
      }
      
      // Tăng số lượng khóa học
      pathProgress[trainingPathId].totalCourses++;
      
      // Cập nhật trạng thái
      if (userCourse.status === CourseStatus.COMPLETED) {
        pathProgress[trainingPathId].completedCourses++;
        if (userCourse.score) {
          pathProgress[trainingPathId].totalScore += userCourse.score;
        }
      } else if (userCourse.status === CourseStatus.IN_PROGRESS) {
        pathProgress[trainingPathId].inProgressCourses++;
      } else {
        pathProgress[trainingPathId].notStartedCourses++;
      }
      
      // Thêm thông tin khóa học
      pathProgress[trainingPathId].courses.push({
        courseId: userCourse.course_id,
        courseTitle: userCourse.course?.title,
        status: userCourse.status,
        score: userCourse.score,
        completionDate: userCourse.completion_date,
        submissionCount: 0, // Placeholder - sẽ được tính sau nếu cần
      });
    }
    
    // Tính điểm trung bình cho mỗi lộ trình
    for (const pathId in pathProgress) {
      if (pathProgress[pathId].completedCourses > 0) {
        pathProgress[pathId].averageScore = 
          pathProgress[pathId].totalScore / pathProgress[pathId].completedCourses;
      }
      delete pathProgress[pathId].totalScore;
    }
    
    // Tính tỷ lệ hoàn thành tổng thể
    const totalCourses = userCourses.length;
    const completedCourses = userCourses.filter(
      uc => uc.status === CourseStatus.COMPLETED
    ).length;
    
    const overallProgress = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
    
    return {
      userId,
      overallProgress: Math.round(overallProgress),
      totalCourses,
      completedCourses,
      pathProgress: Object.values(pathProgress),
    };
  }

  async registerCourse(userId: number, courseId: number): Promise<UserCourse> {
    // Kiểm tra xem đã đăng ký chưa
    const existingEnrollment = await this.userCourseRepository.findOne({
      where: { user_id: userId, course_id: courseId }
    });
    
    if (existingEnrollment) {
      throw new ConflictException('Bạn đã đăng ký khóa học này rồi');
    }
    
    // Kiểm tra khóa học có tồn tại và đang hoạt động
    const course = await this.courseRepository.findOne({
      where: { course_id: courseId, is_active: true }
    });
    
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại hoặc không hoạt động');
    }
    
    // Tạo đăng ký mới
    const userCourse = this.userCourseRepository.create({
      user_id: userId,
      course_id: courseId,
      status: CourseStatus.NOT_STARTED,
    });
    
    return this.userCourseRepository.save(userCourse);
  }

  async confirmAttendance(userId: number, courseId: number, date: string): Promise<any> {
    // Kiểm tra người dùng đã đăng ký khóa học chưa
    const enrollment = await this.userCourseRepository.findOne({
      where: { user_id: userId, course_id: courseId }
    });
    
    if (!enrollment) {
      throw new NotFoundException('Bạn chưa đăng ký khóa học này');
    }
    
    // Chuyển trạng thái sang InProgress nếu chưa bắt đầu
    if (enrollment.status === CourseStatus.NOT_STARTED) {
      enrollment.status = CourseStatus.IN_PROGRESS;
      await this.userCourseRepository.save(enrollment);
    }
    
    // Tạo bản ghi điểm danh (dùng bảng Attendance)
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(attendanceDate.setHours(23, 59, 59, 999));
    
    // Kiểm tra xem đã điểm danh chưa
    const existingAttendance = await this.attendanceRepository.find({
      where: {
        user_id: userId,
        check_in: Between(startOfDay, endOfDay),
        note: `Course attendance: ${courseId}`
      }
    });
    
    if (existingAttendance && existingAttendance.length > 0) {
      return { message: 'Bạn đã điểm danh khóa học này hôm nay rồi', attendance: existingAttendance[0] };
    }
    
    // Tạo bản ghi điểm danh mới
    const attendance = this.attendanceRepository.create({
      user_id: userId,
      check_in: new Date(),
      note: `Course attendance: ${courseId}`
    });
    
    const savedAttendance = await this.attendanceRepository.save(attendance);
    
    return {
      message: 'Xác nhận tham gia khóa học thành công',
      attendance: savedAttendance
    };
  }
}