// src/dashboard/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private isElasticsearchAvailable = false;

  constructor(
    private elasticsearchService: ElasticsearchService,
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
  ) {
    this.checkElasticsearchAvailability();
  }

  private async checkElasticsearchAvailability() {
    try {
      await this.elasticsearchService.isElasticsearchAvailable();
      this.isElasticsearchAvailable = true;
      this.logger.log('Elasticsearch khả dụng cho DashboardService');
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.warn('Elasticsearch không khả dụng cho DashboardService. Sử dụng database để lấy số liệu thống kê.');
    }
  }

  async getDashboardOverview() {
    try {
      if (this.isElasticsearchAvailable) {
        return this.elasticsearchService.getDashboardOverview();
      } else {
        // Fallback to database queries
        const [forumStats, documentStats, taskStats, userStats, trainingStats, attendanceStats] = await Promise.all([
          this.getForumActivityStats(30),
          this.getDocumentStats(30),
          this.getTaskStats(30),
          this.getUserStats(),
          this.getTrainingStats(30),
          this.getAttendanceStats(30),
        ]);
        
        return {
          forumStats,
          documentStats,
          taskStats,
          userStats,
          trainingStats,
          attendanceStats,
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lấy dashboard overview: ${error.message}`);
      throw error;
    }
  }

  async getForumActivityStats(days: number = 30) {
    try {
      if (this.isElasticsearchAvailable) {
        return this.elasticsearchService.getForumActivityStats(days);
      } else {
        // Fallback to database queries
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Số lượng bài viết theo ngày
        const postsPerDay = await this.forumPostsRepository.createQueryBuilder('post')
          .select('DATE(post.created_at)', 'date')
          .addSelect('COUNT(post.post_id)', 'count')
          .where('post.created_at >= :startDate', { startDate })
          .groupBy('DATE(post.created_at)')
          .orderBy('DATE(post.created_at)', 'ASC')
          .getRawMany();
        
        // Người dùng tạo nhiều bài viết nhất
        const topPosters = await this.forumPostsRepository.createQueryBuilder('post')
          .select('post.user_id', 'user_id')
          .addSelect('COUNT(post.post_id)', 'post_count')
          .addSelect('user.full_name', 'user_name')
          .leftJoin('post.user', 'user')
          .where('post.created_at >= :startDate', { startDate })
          .groupBy('post.user_id, user.full_name')
          .orderBy('post_count', 'DESC')
          .limit(10)
          .getRawMany();
        
        // Tổng số bài viết
        const totalPosts = await this.forumPostsRepository.count({
          where: {
            created_at: Between(startDate, new Date())
          }
        });
        
        return {
          postsPerDay,
          topPosters,
          totalPosts,
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lấy forum activity stats: ${error.message}`);
      return {
        postsPerDay: [],
        topPosters: [],
        totalPosts: 0,
      };
    }
  }

  async getDocumentStats(days: number = 30) {
    try {
      if (this.isElasticsearchAvailable) {
        return this.elasticsearchService.getDocumentsStats(days);
      } else {
        // Implement database fallback if needed
        return {
          message: 'Document statistics require Elasticsearch. Please enable Elasticsearch for detailed document statistics.'
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lấy document stats: ${error.message}`);
      return {
        error: error.message
      };
    }
  }

  async getTaskStats(days: number = 30) {
    try {
      if (this.isElasticsearchAvailable) {
        return this.elasticsearchService.getTasksStats(days);
      } else {
        // Fallback to database queries
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Tasks theo trạng thái
        const tasksByStatus = await this.tasksRepository.createQueryBuilder('task')
          .select('task.status', 'status')
          .addSelect('COUNT(task.task_id)', 'count')
          .where('task.created_at >= :startDate', { startDate })
          .groupBy('task.status')
          .getRawMany();
        
        // Tasks theo ngày
        const tasksPerDay = await this.tasksRepository.createQueryBuilder('task')
          .select('DATE(task.created_at)', 'date')
          .addSelect('COUNT(task.task_id)', 'count')
          .where('task.created_at >= :startDate', { startDate })
          .groupBy('DATE(task.created_at)')
          .orderBy('DATE(task.created_at)', 'ASC')
          .getRawMany();
        
        // Người dùng có nhiều nhiệm vụ nhất
        const tasksByUser = await this.tasksRepository.createQueryBuilder('task')
          .select('task.assigned_to', 'user_id')
          .addSelect('COUNT(task.task_id)', 'task_count')
          .addSelect('user.full_name', 'user_name')
          .addSelect('AVG(task.score)', 'avg_score')
          .leftJoin('task.assignedToUser', 'user')
          .where('task.created_at >= :startDate', { startDate })
          .groupBy('task.assigned_to, user.full_name')
          .orderBy('task_count', 'DESC')
          .limit(10)
          .getRawMany();
        
        // Nhiệm vụ quá hạn
        const overdueTasksCount = await this.tasksRepository.count({
          where: {
            deadline: Not(IsNull()),
            status: Not(TaskStatus.COMPLETED),
            deadline: Between(new Date('2000-01-01'), new Date()),
          }
        });
        
        return {
          tasksByStatus,
          tasksPerDay,
          tasksByUser,
          overdueTasksCount,
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lấy task stats: ${error.message}`);
      return {
        tasksByStatus: [],
        tasksPerDay: [],
        tasksByUser: [],
        overdueTasksCount: 0,
      };
    }
  }

  async getTrainingStats(days: number = 30) {
    try {
      // Fallback to database queries
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Khóa học theo trạng thái
      const coursesByStatus = await this.userCoursesRepository.createQueryBuilder('uc')
        .select('uc.status', 'status')
        .addSelect('COUNT(uc.user_course_id)', 'count')
        .groupBy('uc.status')
        .getRawMany();
      
      // Khóa học được đăng ký nhiều nhất
      const topCourses = await this.userCoursesRepository.createQueryBuilder('uc')
        .select('uc.course_id', 'course_id')
        .addSelect('COUNT(uc.user_course_id)', 'enrollment_count')
        .addSelect('course.title', 'course_title')
        .leftJoin('uc.course', 'course')
        .groupBy('uc.course_id, course.title')
        .orderBy('enrollment_count', 'DESC')
        .limit(10)
        .getRawMany();
      
      // Tổng số người dùng đã hoàn thành khóa học
      const completedCoursesCount = await this.userCoursesRepository.count({
        where: {
          status: 'Completed',
        }
      });
      
      // Điểm trung bình
      const avgScoreResult = await this.userCoursesRepository.createQueryBuilder('uc')
        .select('AVG(uc.score)', 'avg_score')
        .where('uc.score IS NOT NULL')
        .getRawOne();
      
      const avgScore = avgScoreResult ? avgScoreResult.avg_score : 0;
      
      return {
        coursesByStatus,
        topCourses,
        completedCoursesCount,
        avgScore,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy training stats: ${error.message}`);
      return {
        coursesByStatus: [],
        topCourses: [],
        completedCoursesCount: 0,
        avgScore: 0,
      };
    }
  }

  async getAttendanceStats(days: number = 30) {
    try {
      // Fallback to database queries
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Số lượng điểm danh theo ngày
      const checkInsPerDay = await this.attendanceRepository.createQueryBuilder('att')
        .select('DATE(att.check_in)', 'date')
        .addSelect('COUNT(att.attendance_id)', 'count')
        .where('att.check_in IS NOT NULL')
        .andWhere('att.check_in >= :startDate', { startDate })
        .groupBy('DATE(att.check_in)')
        .orderBy('DATE(att.check_in)', 'ASC')
        .getRawMany();
      
      // Số lượng nghỉ phép theo loại
      const leavesByType = await this.attendanceRepository.createQueryBuilder('att')
        .select('att.leave_type', 'type')
        .addSelect('COUNT(att.attendance_id)', 'count')
        .where('att.leave_type IS NOT NULL')
        .andWhere('att.leave_date >= :startDate', { startDate })
        .groupBy('att.leave_type')
        .getRawMany();
      
      // Số lượng nghỉ phép theo trạng thái
      const leavesByStatus = await this.attendanceRepository.createQueryBuilder('att')
        .select('att.status', 'status')
        .addSelect('COUNT(att.attendance_id)', 'count')
        .where('att.status IS NOT NULL')
        .andWhere('att.leave_date >= :startDate', { startDate })
        .groupBy('att.status')
        .getRawMany();
      
      // Tổng số giờ làm thêm
      const overtimeResult = await this.attendanceRepository.createQueryBuilder('att')
        .select('SUM(att.overtime_hours)', 'total_overtime')
        .where('att.overtime_hours IS NOT NULL')
        .andWhere('att.check_in >= :startDate', { startDate })
        .getRawOne();
      
      const totalOvertime = overtimeResult ? overtimeResult.total_overtime : 0;
      
      return {
        checkInsPerDay,
        leavesByType,
        leavesByStatus,
        totalOvertime,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy attendance stats: ${error.message}`);
      return {
        checkInsPerDay: [],
        leavesByType: [],
        leavesByStatus: [],
        totalOvertime: 0,
      };
    }
  }

  async getUserStats() {
    try {
      // User stats by role
      const usersByRole = await this.usersRepository.createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(user.user_id)', 'count')
        .groupBy('user.role')
        .getRawMany();
      
      // User stats by department
      const usersByDepartment = await this.usersRepository.createQueryBuilder('user')
        .select('department.department_name', 'department')
        .addSelect('COUNT(user.user_id)', 'count')
        .leftJoin('user.department', 'department')
        .groupBy('department.department_name')
        .orderBy('count', 'DESC')
        .getRawMany();
      
      // Recent users
      const recentUsers = await this.usersRepository.find({
        order: { created_at: 'DESC' },
        take: 5,
      });
      
      return {
        usersByRole,
        usersByDepartment,
        recentUsers,
        totalUsers: await this.usersRepository.count(),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy user stats: ${error.message}`);
      return {
        usersByRole: [],
        usersByDepartment: [],
        recentUsers: [],
        totalUsers: 0,
      };
    }
  }

  async refreshAllStats() {
    try {
      if (this.isElasticsearchAvailable) {
        await Promise.all([
          this.elasticsearchService.syncForumPosts(),
          this.elasticsearchService.syncDocuments(),
          this.elasticsearchService.syncTasks(),
          this.elasticsearchService.syncNotifications(),
          this.elasticsearchService.syncUsers(),
        ]);
        
        return { message: 'Dashboard data refreshed successfully' };
      } else {
        return { message: 'Elasticsearch is not available. Stats are fetched directly from database.' };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi refresh dashboard data: ${error.message}`);
      throw error;
    }
  }

  async getSystemLogs(level?: string, startDate?: string, endDate?: string, page: number = 1, size: number = 50) {
    try {
      if (this.isElasticsearchAvailable) {
        return this.elasticsearchService.getSystemLogs(level, startDate, endDate, page, size);
      } else {
        return {
          message: 'System logs require Elasticsearch. Please enable Elasticsearch for system logs.',
          logs: [],
          pagination: {
            total: 0,
            page,
            size,
            pages: 0,
          },
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lấy system logs: ${error.message}`);
      throw error;
    }
  }
}