// src/dashboard/dashboard.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, LessThan, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse, CourseStatus } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

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
    private elasticsearchService: ElasticsearchService,
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
    
    const stats = {
      totalUsers,
      usersByRole,
      tasksByStatus,
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
  
  // Advanced dashboard method leveraging Elasticsearch
  async getEnhancedDashboard() {
    try {
      // Get data from various sources
      const baseStats = await this.getStats();
      const attendanceStats = await this.getAttendanceStats();
      const trainingStats = await this.getTrainingStats();
      
      // Get upcoming tasks from Elasticsearch
      const upcomingTasks = await this.elasticsearchService.getUpcomingTasks(5);
      
      // Get document categories from Elasticsearch
      const documentCategories = await this.elasticsearchService.getDocumentCategories();
      
      // Get recent documents from Elasticsearch
      const recentDocuments = await this.elasticsearchService.getRecentDocuments(5);
      
      // Combine all data
      return {
        totalUsers: baseStats.totalUsers,
        checkInsToday: attendanceStats.checkInsToday,
        pendingLeaves: attendanceStats.pendingLeaves,
        activeCourses: trainingStats.activeCourses,
        courseRegistrationByStatus: trainingStats.courseRegistrationByStatus,
        upcomingTasks,
        documentCategories,
        recentDocuments,
        usersByRole: baseStats.usersByRole,
        tasksByStatus: baseStats.tasksByStatus,
      };
    } catch (error) {
      this.logger.error(`Error getting enhanced dashboard: ${error.message}`);
      
      // Return basic dashboard if we encounter any errors with Elasticsearch
      const baseStats = await this.getStats();
      const attendanceStats = await this.getAttendanceStats();
      const trainingStats = await this.getTrainingStats();
      
      return {
        totalUsers: baseStats.totalUsers,
        checkInsToday: attendanceStats.checkInsToday,
        pendingLeaves: attendanceStats.pendingLeaves,
        activeCourses: trainingStats.activeCourses,
        courseRegistrationByStatus: trainingStats.courseRegistrationByStatus,
        upcomingTasks: [],
        documentCategories: [],
        recentDocuments: [],
        usersByRole: baseStats.usersByRole,
        tasksByStatus: baseStats.tasksByStatus,
      };
    }
  }
  
  // Phương thức để xóa cache khi cần
  async invalidateDashboardCache() {
    await this.cacheManager.del('dashboard_stats');
    await this.cacheManager.del('attendance_stats');
    await this.cacheManager.del('training_stats');
  }
}