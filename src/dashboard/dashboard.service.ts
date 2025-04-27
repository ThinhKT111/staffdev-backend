// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    
    @InjectRepository(UserCourse)
    private userCoursesRepository: Repository<UserCourse>,
    
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    
    @InjectRepository(ForumPost)
    private forumPostsRepository: Repository<ForumPost>,
  ) {}

  async getStats() {
    // Tổng số người dùng
    const totalUsers = await this.usersRepository.count();
    
    // Số người dùng theo vai trò
    const usersByRole = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(user.user_id) as count')
      .groupBy('user.role')
      .getRawMany();
    
    // Số nhiệm vụ theo trạng thái
    const tasksByStatus = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status, COUNT(task.task_id) as count')
      .groupBy('task.status')
      .getRawMany();
    
    // Số bài đăng diễn đàn gần đây
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPosts = await this.forumPostsRepository
      .createQueryBuilder('post')
      .where('post.created_at >= :date', { date: thirtyDaysAgo })
      .getCount();
    
    return {
      totalUsers,
      usersByRole,
      tasksByStatus,
      recentPosts,
    };
  }

  async getAttendanceStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Số người điểm danh hôm nay
    const checkInsToday = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.check_in BETWEEN :start AND :end', { 
        start: today, 
        end: endOfDay 
      })
      .getCount();
    
    // Số đơn nghỉ phép đang chờ duyệt
    const pendingLeaves = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.status = :status', { status: 'pending' })
      .andWhere('attendance.leave_type IS NOT NULL')
      .getCount();
    
    // Số giờ tăng ca tháng này
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const overtimeHours = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('SUM(attendance.overtime_hours)', 'total')
      .where('attendance.check_in >= :firstDay', { firstDay: firstDayOfMonth })
      .andWhere('attendance.overtime_hours IS NOT NULL')
      .getRawOne();
    
    return {
      checkInsToday,
      pendingLeaves,
      overtimeHours: overtimeHours?.total || 0,
    };
  }

  async getTrainingStats() {
    // Số khóa học đang hoạt động
    const activeCourses = await this.coursesRepository.count({
      where: {
        is_active: true,
      },
    });
    
    // Số lượng đăng ký khóa học theo trạng thái
    const courseRegistrationByStatus = await this.userCoursesRepository
      .createQueryBuilder('userCourse')
      .select('userCourse.status, COUNT(userCourse.user_course_id) as count')
      .groupBy('userCourse.status')
      .getRawMany();
    
    // Điểm trung bình của các khóa học đã hoàn thành
    const averageScore = await this.userCoursesRepository
      .createQueryBuilder('userCourse')
      .select('AVG(userCourse.score)', 'average')
      .where('userCourse.status = :status', { status: 'Completed' })
      .andWhere('userCourse.score IS NOT NULL')
      .getRawOne();
    
    return {
      activeCourses,
      courseRegistrationByStatus,
      averageScore: averageScore?.average || 0,
    };
  }
}