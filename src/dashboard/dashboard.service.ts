// src/dashboard/dashboard.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, Equal, FindOperator } from 'typeorm';
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

    private elasticsearchService: ElasticsearchService
  ) {}

  async getStats() {
    // Check cache
    const cachedStats = await this.cacheManager.get('dashboard_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    // Total users
    const totalUsers = await this.usersRepository.count();
    
    // Users by role
    const usersByRole = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(user.user_id) as count')
      .groupBy('user.role')
      .getRawMany();
    
    // Tasks by status
    const tasksByStatus = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status, COUNT(task.task_id) as count')
      .groupBy('task.status')
      .getRawMany();
    
    // Recent forum posts
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPosts = await this.forumPostsRepository
      .createQueryBuilder('post')
      .where('post.created_at >= :date', { date: thirtyDaysAgo })
      .getCount();
    
    // Check if Elasticsearch is available for enriched stats
    let enrichedStats = {};
    if (this.elasticsearchService && this.elasticsearchService.getElasticsearchAvailability()) {
      try {
        const forumStats = await this.elasticsearchService.getForumStatistics();
        const documentStats = await this.elasticsearchService.getDocumentStatistics();
        
        enrichedStats = {
          forumStats,
          documentStats
        };
      } catch (error) {
        console.error('Error getting enriched stats from Elasticsearch:', error);
      }
    }
    
    const stats = {
      totalUsers,
      usersByRole,
      tasksByStatus,
      recentPosts,
      enrichedStats
    };
    
    // Cache results for 15 minutes
    await this.cacheManager.set('dashboard_stats', stats, 900);
    
    return stats;
  }

  async getAttendanceStats() {
    // Check cache
    const cachedStats = await this.cacheManager.get('attendance_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Number of check-ins today
    const checkInsToday = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.check_in BETWEEN :start AND :end', { 
        start: today, 
        end: endOfDay 
      })
      .getCount();
    
    // Pending leave requests
    const pendingLeaves = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.status = :status', { status: 'pending' })
      .andWhere('attendance.leave_type IS NOT NULL')
      .getCount();
    
    // Overtime hours this month
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
    
    // Cache results for 30 minutes
    await this.cacheManager.set('attendance_stats', stats, 1800);
    
    return stats;
  }

  async getTrainingStats() {
    // Check cache
    const cachedStats = await this.cacheManager.get('training_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    // Active courses
    const activeCourses = await this.coursesRepository.count({
      where: {
        is_active: true,
      },
    });
    
    // Course registrations by status
    const courseRegistrationByStatus = await this.userCoursesRepository
      .createQueryBuilder('userCourse')
      .select('userCourse.status, COUNT(userCourse.user_course_id) as count')
      .groupBy('userCourse.status')
      .getRawMany();
    
    // Average score of completed courses
    const averageScore = await this.userCoursesRepository
      .createQueryBuilder('userCourse')
      .select('AVG(userCourse.score)', 'average')
      .where('userCourse.status = :status', { status: 'Completed' })
      .andWhere('userCourse.score IS NOT NULL')
      .getRawOne();
    
    // Course completion rate
    const totalCourses = await this.userCoursesRepository.count();
    const completedCourses = await this.userCoursesRepository.count({
      where: { status: CourseStatus.COMPLETED }
    });
    
    const stats = {
      activeCourses,
      courseRegistrationByStatus,
      averageScore: averageScore?.average || 0,
      completionRate: totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0
    };
    
    // Cache results for 1 hour
    await this.cacheManager.set('training_stats', stats, 3600);
    
    return stats;
  }
  
  // Method to invalidate dashboard cache when needed
  async invalidateDashboardCache() {
    await this.cacheManager.del('dashboard_stats');
    await this.cacheManager.del('attendance_stats');
    await this.cacheManager.del('training_stats');
  }
}