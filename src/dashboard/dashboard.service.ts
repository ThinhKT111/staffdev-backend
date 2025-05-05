// src/dashboard/dashboard.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Course } from '../entities/course.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ForumComment } from '../entities/forum-comment.entity';
import { Document } from '../entities/document.entity';

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
    
    @InjectRepository(ForumComment)
    private forumCommentsRepository: Repository<ForumComment>,
    
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    
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
      .where('userCourse.status = :status', { status: 'Completed' })
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
  
  // Thống kê về diễn đàn
  async getForumActivityStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('forum_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const totalPosts = await this.forumPostsRepository.count();
    const totalComments = await this.forumCommentsRepository.count();
    
    // Lấy thống kê số bài đăng theo ngày (trong 30 ngày gần đây)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const postsByDay = await this.forumPostsRepository
      .createQueryBuilder('post')
      .select('DATE(post.created_at) as date, COUNT(post.post_id) as count')
      .where('post.created_at >= :date', { date: thirtyDaysAgo })
      .groupBy('DATE(post.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
    
    // Bài viết có nhiều bình luận nhất
    const mostCommentedPosts = await this.forumCommentsRepository
      .createQueryBuilder('comment')
      .select('comment.post_id, COUNT(comment.comment_id) as comment_count')
      .groupBy('comment.post_id')
      .orderBy('comment_count', 'DESC')
      .limit(5)
      .getRawMany();
    
    // Lấy thông tin chi tiết bài viết
    const postIds = mostCommentedPosts.map(post => post.post_id);
    const posts = await this.forumPostsRepository.find({
      where: { post_id: In(postIds) },
      relations: ['user']
    });
    
    const mostCommentedPostsWithDetails = mostCommentedPosts.map(rawPost => {
      const post = posts.find(p => p.post_id === rawPost.post_id);
      return {
        post_id: rawPost.post_id,
        title: post?.title || 'Unknown',
        author: post?.user?.full_name || 'Unknown',
        comment_count: rawPost.comment_count
      };
    });
    
    const stats = {
      totalPosts,
      totalComments,
      postsByDay,
      mostCommentedPosts: mostCommentedPostsWithDetails,
      // Thêm các thống kê khác nếu cần
    };
    
    // Cache lại kết quả trong 1 giờ
    await this.cacheManager.set('forum_stats', stats, 3600);
    
    return stats;
  }
  
  // Thống kê về tài liệu
  async getDocumentStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('document_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const totalDocuments = await this.documentsRepository.count();
    
    // Số lượng tài liệu theo danh mục
    const documentsByCategory = await this.documentsRepository
      .createQueryBuilder('doc')
      .select('doc.category, COUNT(doc.document_id) as count')
      .groupBy('doc.category')
      .getRawMany();
    
    // Tài liệu mới nhất
    const recentDocuments = await this.documentsRepository.find({
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
      take: 5
    });
    
    const stats = {
      totalDocuments,
      documentsByCategory,
      recentDocuments: recentDocuments.map(doc => ({
        document_id: doc.document_id,
        title: doc.title,
        category: doc.category,
        uploaded_by: doc.uploader?.full_name || 'Unknown',
        uploaded_at: doc.uploaded_at
      }))
    };
    
    // Cache lại kết quả trong 1 giờ
    await this.cacheManager.set('document_stats', stats, 3600);
    
    return stats;
  }
  
  // Thống kê về nhiệm vụ
  async getTaskStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('task_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const totalTasks = await this.tasksRepository.count();
    
    // Số nhiệm vụ theo trạng thái
    const tasksByStatus = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status, COUNT(task.task_id) as count')
      .groupBy('task.status')
      .getRawMany();
    
    // Nhiệm vụ sắp đến hạn
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);
    
    const upcomingDeadlines = await this.tasksRepository.find({
      where: {
        deadline: Between(today, oneWeekLater),
        status: Not(In(['Completed', 'Rejected']))
      },
      relations: ['assignedToUser', 'assignedByUser'],
      order: { deadline: 'ASC' },
      take: 10
    });
    
    const stats = {
      totalTasks,
      tasksByStatus,
      upcomingDeadlines: upcomingDeadlines.map(task => ({
        task_id: task.task_id,
        title: task.title,
        deadline: task.deadline,
        status: task.status,
        assigned_to: task.assignedToUser?.full_name || 'Unknown',
        assigned_by: task.assignedByUser?.full_name || 'Unknown'
      }))
    };
    
    // Cache lại kết quả trong 30 phút
    await this.cacheManager.set('task_stats', stats, 1800);
    
    return stats;
  }
  
  // Thống kê về người dùng
  async getUserStats() {
    // Kiểm tra cache
    const cachedStats = await this.cacheManager.get('user_stats');
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const totalUsers = await this.usersRepository.count();
    
    // Số người dùng theo vai trò
    const usersByRole = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(user.user_id) as count')
      .groupBy('user.role')
      .getRawMany();
    
    // Số người dùng theo phòng ban
    const usersByDepartment = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.department', 'department')
      .select('department.department_name, COUNT(user.user_id) as count')
      .groupBy('department.department_name')
      .getRawMany();
    
    // Người dùng mới nhất
    const recentUsers = await this.usersRepository.find({
      relations: ['department'],
      order: { created_at: 'DESC' },
      take: 5
    });
    
    const stats = {
      totalUsers,
      usersByRole,
      usersByDepartment,
      recentUsers: recentUsers.map(user => ({
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department?.department_name || 'Unknown',
        created_at: user.created_at
      }))
    };
    
    // Cache lại kết quả trong 1 giờ
    await this.cacheManager.set('user_stats', stats, 3600);
    
    return stats;
  }
  
  // Làm mới tất cả thống kê
  async refreshAllStats() {
    // Xóa tất cả cache
    await this.cacheManager.del('dashboard_stats');
    await this.cacheManager.del('attendance_stats');
    await this.cacheManager.del('training_stats');
    await this.cacheManager.del('forum_stats');
    await this.cacheManager.del('document_stats');
    await this.cacheManager.del('task_stats');
    await this.cacheManager.del('user_stats');
    
    // Cập nhật lại tất cả thống kê
    const [stats, attendanceStats, trainingStats, forumStats, documentStats, taskStats, userStats] =
      await Promise.all([
        this.getStats(),
        this.getAttendanceStats(),
        this.getTrainingStats(),
        this.getForumActivityStats(),
        this.getDocumentStats(),
        this.getTaskStats(),
        this.getUserStats()
      ]);
    
    return {
      message: 'All statistics refreshed successfully',
      timestamp: new Date().toISOString()
    };
  }
  
  // Tổng quan dashboard
  async getDashboardOverview() {
    // Thống kê tổng quan từ các phương thức đã có
    const [stats, attendanceStats, trainingStats, taskStats] = await Promise.all([
      this.getStats(),
      this.getAttendanceStats(),
      this.getTrainingStats(),
      this.getTaskStats()
    ]);
    
    return {
      users: {
        total: stats.totalUsers,
        byRole: stats.usersByRole
      },
      tasks: {
        byStatus: stats.tasksByStatus,
        upcomingDeadlines: taskStats.upcomingDeadlines ? taskStats.upcomingDeadlines.slice(0, 3) : []
      },
      attendance: {
        checkInsToday: attendanceStats.checkInsToday,
        pendingLeaves: attendanceStats.pendingLeaves
      },
      training: {
        activeCourses: trainingStats.activeCourses,
        registrationByStatus: trainingStats.courseRegistrationByStatus
      }
    };
  }
  
  // Logs hệ thống - giả lập
  async getSystemLogs() {
    // Trong một hệ thống thực tế, sẽ lấy từ cơ sở dữ liệu log
    return {
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'System is running normally',
          source: 'System'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'INFO',
          message: 'User login successful',
          source: 'AuthService'
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'WARNING',
          message: 'High CPU usage detected',
          source: 'MonitoringService'
        }
      ],
      total: 3
    };
  }
}