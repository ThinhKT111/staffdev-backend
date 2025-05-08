// src/dashboard/dashboard.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, In, LessThan, MoreThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse, CourseStatus } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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
    
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('dashboard_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
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
    
    // Nhiệm vụ sắp đến hạn (trong 7 ngày tới)
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    
    const upcomingDeadlines = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.deadline BETWEEN :today AND :sevenDaysLater', {
        today,
        sevenDaysLater,
      })
      .andWhere('task.status NOT IN (:...statuses)', {
        statuses: [TaskStatus.COMPLETED, TaskStatus.REJECTED],
      })
      .getMany();
    
    const stats = {
      totalUsers,
      usersByRole,
      tasksByStatus,
      upcomingDeadlines,
      recentPosts,
    };
    
    // Cache lại kết quả trong 15 phút
    await this.cacheManager.set('dashboard_stats', stats, 900);
    
    return stats;
  }

  async getAttendanceStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('attendance_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
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
    
    const stats = {
      checkInsToday,
      pendingLeaves,
      overtimeHours: overtimeHours?.total || 0,
    };
    
    // Cache lại kết quả trong 30 phút
    await this.cacheManager.set('attendance_stats', stats, 1800);
    
    return stats;
  }

  async getTrainingStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('training_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
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
      .where('userCourse.status = :status', { status: CourseStatus.COMPLETED })
      .andWhere('userCourse.score IS NOT NULL')
      .getRawOne();
    
    const stats = {
      activeCourses,
      courseRegistrationByStatus,
      averageScore: averageScore?.average || 0,
    };
    
    // Cache lại kết quả trong 1 giờ
    await this.cacheManager.set('training_stats', stats, 3600);
    
    return stats;
  }
  
  // Phương thức để lấy dữ liệu dashboard tổng hợp cho trang chủ
  async getDashboardSummary() {
    // Kiểm tra cache
    const cachedSummary = await this.cacheManager.get('dashboard_summary');
    
    if (cachedSummary) {
      return cachedSummary;
    }
    
    // Lấy dữ liệu từ các phương thức khác
    const [generalStats, attendanceStats, trainingStats] = await Promise.all([
      this.getStats(),
      this.getAttendanceStats(),
      this.getTrainingStats(),
    ]);
    
    // Lấy 5 nhiệm vụ gần nhất sắp đến hạn
    const today = new Date();
    const upcomingTasks = await this.tasksRepository.find({
      where: {
        deadline: MoreThan(today),
        status: Not(In([TaskStatus.COMPLETED, TaskStatus.REJECTED])),
      },
      relations: ['assignedToUser', 'assignedByUser'],
      order: {
        deadline: 'ASC',
      },
      take: 5,
    });
    
    // Lấy 5 bài đăng diễn đàn mới nhất
    const recentPosts = await this.forumPostsRepository.find({
      relations: ['user'],
      order: {
        created_at: 'DESC',
      },
      take: 5,
    });
    
    // Tổng hợp dữ liệu
    const summary = {
      totalUsers: generalStats.totalUsers,
      checkInsToday: attendanceStats.checkInsToday,
      pendingLeaves: attendanceStats.pendingLeaves,
      activeCourses: trainingStats.activeCourses,
      courseRegistrationByStatus: trainingStats.courseRegistrationByStatus,
      upcomingDeadlines: generalStats.upcomingDeadlines?.slice(0, 5), // Lấy 5 phần tử đầu tiên
      recentPosts,
    };
    
    // Cache lại kết quả trong 15 phút
    await this.cacheManager.set('dashboard_summary', summary, 900);
    
    return summary;
  }
  
  // Phương thức để xóa cache khi cần
  async invalidateDashboardCache() {
    await this.cacheManager.del('dashboard_stats');
    await this.cacheManager.del('attendance_stats');
    await this.cacheManager.del('training_stats');
    await this.cacheManager.del('dashboard_summary');
  }
}