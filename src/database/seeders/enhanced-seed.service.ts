// src/database/seeders/enhanced-seed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Profile } from '../../entities/profile.entity';
import { TrainingPath, DurationType } from '../../entities/training-path.entity';
import { Course, CourseType, CourseLevel } from '../../entities/course.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { ForumPost } from '../../entities/forum-post.entity';
import { ForumComment } from '../../entities/forum-comment.entity';
import { UserCourse, CourseStatus } from '../../entities/user-course.entity';
import { Attendance, LeaveType, AttendanceStatus } from '../../entities/attendance.entity';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { Assignment } from '../../entities/assignment.entity';
import { Submission } from '../../entities/submission.entity';
import { Document } from '../../entities/document.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EnhancedSeedService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(TrainingPath)
    private trainingPathsRepository: Repository<TrainingPath>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(ForumPost)
    private forumPostsRepository: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private forumCommentsRepository: Repository<ForumComment>,
    @InjectRepository(UserCourse)
    private userCoursesRepository: Repository<UserCourse>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async seed() {
    try {
      // Seed departments
      const departments = await this.seedDepartments();
      
      // Seed users
      const users = await this.seedUsers();
      
      // Seed profiles
      await this.seedProfiles(users);
      
      // Seed training paths
      const trainingPaths = await this.seedTrainingPaths(users);
      
      // Seed courses
      const courses = await this.seedCourses(trainingPaths);
      
      // Seed tasks
      await this.seedTasks(users);
      
      // Seed forum posts and comments
      await this.seedForumContent(users);
      
      // Seed user courses
      await this.seedUserCourses(users, courses);
      
      // Seed attendance
      await this.seedAttendance(users);
      
      // Seed notifications
      await this.seedNotifications(users);
      
      // Seed assignments
      const assignments = await this.seedAssignments(courses);
      
      // Seed submissions
      await this.seedSubmissions(users, assignments);
      
      // Seed documents
      await this.seedDocuments(users);
      
      console.log('Tất cả dữ liệu đã được khởi tạo thành công!');
    } catch (error) {
      console.error('Lỗi khi seed dữ liệu:', error);
      throw error;
    }
  }

  private async seedDepartments() {
    const departmentsCount = await this.departmentsRepository.count();
    if (departmentsCount === 0) {
      const departments = [
        { department_name: 'IT' },
        { department_name: 'HR' },
        { department_name: 'Finance' },
        { department_name: 'Marketing' },
        { department_name: 'Sales' },
        { department_name: 'Operations' },
        { department_name: 'Customer Support' },
        { department_name: 'Research & Development' }
      ];
      
      await this.departmentsRepository.save(departments);
      console.log('Departments seeded successfully');
    }
    return await this.departmentsRepository.find();
  }

  private async seedUsers() {
    const userCount = await this.usersRepository.count();
    if (userCount === 0) {
      // Hash password
      const hashedPassword = await bcrypt.hash('password', 10);
      
      // Create admin user
      const admin = this.usersRepository.create({
        cccd: '034095000123',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '0912345678',
        full_name: 'Administrator',
        role: UserRole.ADMIN,
        department_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      
      await this.usersRepository.save(admin);
      
      // Create sample users with different roles
      const users = [
        {
          cccd: '034095000124',
          password: hashedPassword,
          email: 'employee1@example.com',
          phone: '0912345679',
          full_name: 'Nguyễn Văn A',
          role: UserRole.EMPLOYEE,
          department_id: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          cccd: '034095000125',
          password: hashedPassword,
          email: 'manager@example.com',
          phone: '0912345680',
          full_name: 'Trần Thị B',
          role: UserRole.TEAM_LEADER,
          department_id: 3,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          cccd: '034095000126',
          password: hashedPassword,
          email: 'senior@example.com',
          phone: '0912345681',
          full_name: 'Lê Văn C',
          role: UserRole.SENIOR_MANAGER,
          department_id: 4,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          cccd: '034095000127',
          password: hashedPassword,
          email: 'employee2@example.com',
          phone: '0912345682',
          full_name: 'Phạm Thị D',
          role: UserRole.EMPLOYEE,
          department_id: 5,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          cccd: '034095000128',
          password: hashedPassword,
          email: 'teamlead@example.com',
          phone: '0912345683',
          full_name: 'Hoàng Văn E',
          role: UserRole.TEAM_LEADER,
          department_id: 1,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ];
      
      await this.usersRepository.save(users);
      console.log('Users seeded successfully');
    }
    return await this.usersRepository.find();
  }

  private async seedProfiles(users: User[]) {
    const profileCount = await this.profilesRepository.count();
    if (profileCount === 0) {
      const profiles = users.map(user => ({
        user_id: user.user_id,
        date_of_birth: new Date(1985, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        address: `Số ${Math.floor(Math.random() * 100) + 1}, Đường ${Math.floor(Math.random() * 100) + 1}, Thành phố Hồ Chí Minh`,
        experience: `${Math.floor(Math.random() * 10) + 1} năm kinh nghiệm trong lĩnh vực ${user.department_id === 1 ? 'IT' : user.department_id === 2 ? 'Nhân sự' : 'Quản lý'}`,
        skills: `Microsoft Office, ${user.department_id === 1 ? 'Java, Python, Javascript' : user.department_id === 2 ? 'Tuyển dụng, Đào tạo' : 'Quản lý dự án, Lãnh đạo nhóm'}`,
        avatar_url: null,
        updated_at: new Date()
      }));
      
      await this.profilesRepository.save(profiles);
      console.log('Profiles seeded successfully');
    }
  }

  private async seedTrainingPaths(users: User[]) {
    const trainingPathCount = await this.trainingPathsRepository.count();
    if (trainingPathCount === 0) {
      const adminUser = users.find(user => user.role === UserRole.ADMIN);
      const teamLeadUser = users.find(user => user.role === UserRole.TEAM_LEADER);
      
      if (!adminUser || !teamLeadUser) return [];
      
      const trainingPaths = [
        {
          title: 'Khóa học cơ bản về phát triển phần mềm',
          description: 'Khóa học cung cấp kiến thức cơ bản về phát triển phần mềm cho nhân viên mới',
          department_id: 1, // IT
          duration: DurationType.SHORT_TERM,
          created_by: adminUser.user_id,
          total_courses: 3,
          duration_in_weeks: 4,
          is_active: true,
          created_at: new Date()
        },
        {
          title: 'Quản lý dự án chuyên nghiệp',
          description: 'Khóa học dành cho team lead và quản lý dự án',
          department_id: 1, // IT
          duration: DurationType.LONG_TERM,
          created_by: adminUser.user_id,
          total_courses: 5,
          duration_in_weeks: 12,
          is_active: true,
          created_at: new Date()
        },
        {
          title: 'Kỹ năng giao tiếp chuyên nghiệp',
          description: 'Nâng cao kỹ năng giao tiếp trong môi trường làm việc',
          department_id: 2, // HR
          duration: DurationType.SHORT_TERM,
          created_by: teamLeadUser.user_id,
          total_courses: 2,
          duration_in_weeks: 2,
          is_active: true,
          created_at: new Date()
        },
        {
          title: 'Kỹ năng lãnh đạo',
          description: 'Khóa học dành cho các quản lý cấp trung và cấp cao',
          department_id: 3, // Finance
          duration: DurationType.LONG_TERM,
          created_by: adminUser.user_id,
          total_courses: 4,
          duration_in_weeks: 8,
          is_active: true,
          created_at: new Date()
        },
      ];
      
      await this.trainingPathsRepository.save(trainingPaths);
      console.log('Training paths seeded successfully');
    }
    return await this.trainingPathsRepository.find();
  }

  private async seedCourses(trainingPaths: TrainingPath[]) {
    const courseCount = await this.coursesRepository.count();
    if (courseCount === 0 && trainingPaths.length > 0) {
      const trainingPath1 = trainingPaths[0]; // Khóa học cơ bản về phát triển phần mềm
      const trainingPath2 = trainingPaths[1]; // Quản lý dự án chuyên nghiệp
      
      if (!trainingPath1 || !trainingPath2) return [];
      
      const courses = [
        {
          training_path_id: trainingPath1.training_path_id,
          title: 'Giới thiệu về lập trình',
          description: 'Khóa học cơ bản giới thiệu về lập trình cho người mới bắt đầu',
          type: CourseType.ONLINE,
          duration_hours: 10,
          level: CourseLevel.BEGINNER,
          total_lessons: 5,
          is_active: true,
          created_at: new Date()
        },
        {
          training_path_id: trainingPath1.training_path_id,
          title: 'Cơ sở dữ liệu',
          description: 'Nguyên lý cơ bản về cơ sở dữ liệu quan hệ và NoSQL',
          type: CourseType.ONLINE,
          duration_hours: 15,
          level: CourseLevel.BEGINNER,
          total_lessons: 8,
          is_active: true,
          created_at: new Date()
        },
        {
          training_path_id: trainingPath1.training_path_id,
          title: 'Phát triển web cơ bản',
          description: 'HTML, CSS và JavaScript cơ bản',
          type: CourseType.ONLINE,
          duration_hours: 20,
          level: CourseLevel.BEGINNER,
          total_lessons: 10,
          is_active: true,
          created_at: new Date()
        },
        {
          training_path_id: trainingPath2.training_path_id,
          title: 'Nguyên tắc quản lý dự án',
          description: 'Các nguyên tắc cơ bản trong quản lý dự án',
          type: CourseType.OFFLINE,
          duration_hours: 12,
          level: CourseLevel.INTERMEDIATE,
          total_lessons: 6,
          is_active: true,
          created_at: new Date()
        },
        {
          training_path_id: trainingPath2.training_path_id,
          title: 'Phương pháp Agile Scrum',
          description: 'Áp dụng phương pháp Agile Scrum trong quản lý dự án',
          type: CourseType.OFFLINE,
          duration_hours: 16,
          level: CourseLevel.INTERMEDIATE,
          total_lessons: 8,
          is_active: true,
          created_at: new Date()
        },
      ];
      
      await this.coursesRepository.save(courses);
      console.log('Courses seeded successfully');
    }
    return await this.coursesRepository.find();
  }

  private async seedTasks(users: User[]) {
    const taskCount = await this.tasksRepository.count();
    if (taskCount === 0 && users.length >= 5) {
      const admin = users.find(u => u.role === UserRole.ADMIN);
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      const employee2 = users.find(u => u.email === 'employee2@example.com');
      
      if (!admin || !teamLead || !employee1 || !employee2) return;
      
      const tasks = [
        {
          title: 'Hoàn thành khóa học lập trình cơ bản',
          description: 'Hoàn thành tất cả các bài học và bài tập trong khóa học lập trình cơ bản',
          assigned_to: employee1.user_id,
          assigned_by: teamLead.user_id,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 tuần từ bây giờ
          status: TaskStatus.IN_PROGRESS,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          title: 'Soạn tài liệu hướng dẫn cho nhân viên mới',
          description: 'Chuẩn bị tài liệu hướng dẫn giới thiệu về các quy trình làm việc cho nhân viên mới',
          assigned_to: teamLead.user_id,
          assigned_by: admin.user_id,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 tuần từ bây giờ
          status: TaskStatus.PENDING,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          title: 'Báo cáo tiến độ dự án hàng tuần',
          description: 'Chuẩn bị báo cáo tiến độ dự án hàng tuần để trình bày trong cuộc họp',
          assigned_to: employee1.user_id,
          assigned_by: admin.user_id,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 ngày từ bây giờ
          status: TaskStatus.PENDING,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          title: 'Nghiên cứu công nghệ mới',
          description: 'Nghiên cứu về các công nghệ mới và đề xuất ứng dụng vào dự án hiện tại',
          assigned_to: employee2.user_id,
          assigned_by: teamLead.user_id,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 tháng từ bây giờ
          status: TaskStatus.IN_PROGRESS,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          title: 'Tham gia buổi đào tạo về an ninh mạng',
          description: 'Tham gia buổi đào tạo về an ninh mạng và chia sẻ kiến thức với đồng nghiệp',
          assigned_to: employee2.user_id,
          assigned_by: admin.user_id,
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 ngày từ bây giờ
          status: TaskStatus.PENDING,
          created_at: new Date(),
          updated_at: new Date()
        },
      ];
      
      await this.tasksRepository.save(tasks);
      console.log('Tasks seeded successfully');
    }
  }

  private async seedForumContent(users: User[]) {
    const postCount = await this.forumPostsRepository.count();
    if (postCount === 0 && users.length >= 3) {
      const admin = users.find(u => u.role === UserRole.ADMIN);
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      
      if (!admin || !teamLead || !employee1) return;
      
      // Create forum posts
      const posts = [
        {
          user_id: admin.user_id,
          title: 'Chào mừng đến với diễn đàn nội bộ',
          content: 'Chào mừng tất cả mọi người đến với diễn đàn nội bộ của công ty. Đây là nơi để chia sẻ kiến thức, đặt câu hỏi và tương tác với đồng nghiệp.',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          user_id: teamLead.user_id,
          title: 'Chia sẻ kinh nghiệm quản lý dự án',
          content: 'Tôi muốn chia sẻ một số kinh nghiệm khi quản lý dự án phần mềm. Các bạn có thể tham khảo và đóng góp thêm ý kiến.',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          user_id: employee1.user_id,
          title: 'Câu hỏi về quy trình làm việc mới',
          content: 'Tôi có một số thắc mắc về quy trình làm việc mới được áp dụng. Mọi người có thể giúp giải đáp không?',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const savedPosts = await this.forumPostsRepository.save(posts);
      console.log('Forum posts seeded successfully');
      
      // Create comments for posts
      if (savedPosts.length > 0) {
        const comments = [
          {
            post_id: savedPosts[0].post_id,
            user_id: teamLead.user_id,
            content: 'Cảm ơn Admin đã tạo diễn đàn này. Đây sẽ là nơi hữu ích để chúng ta trao đổi thông tin.',
            created_at: new Date(),
          },
          {
            post_id: savedPosts[0].post_id,
            user_id: employee1.user_id,
            content: 'Rất vui được tham gia diễn đàn. Tôi hy vọng sẽ học hỏi được nhiều điều từ mọi người.',
            created_at: new Date(),
          },
          {
            post_id: savedPosts[1].post_id,
            user_id: admin.user_id,
            content: 'Bài viết rất hữu ích. Cảm ơn bạn đã chia sẻ kinh nghiệm quý báu.',
            created_at: new Date(),
          },
          {
            post_id: savedPosts[2].post_id,
            user_id: teamLead.user_id,
            content: 'Tôi sẽ giải đáp thắc mắc của bạn về quy trình mới. Hãy xem tài liệu tôi vừa gửi qua email nhé.',
            created_at: new Date(),
          },
        ];
        
        await this.forumCommentsRepository.save(comments);
        console.log('Forum comments seeded successfully');
      }
    }
  }

  private async seedUserCourses(users: User[], courses: Course[]) {
    const userCourseCount = await this.userCoursesRepository.count();
    if (userCourseCount === 0 && users.length >= 3 && courses.length >= 3) {
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      const employee2 = users.find(u => u.email === 'employee2@example.com');
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      
      if (!employee1 || !employee2 || !teamLead) return;
      
      const userCourses = [
        {
          user_id: employee1.user_id,
          course_id: courses[0].course_id, // Giới thiệu về lập trình
          status: CourseStatus.COMPLETED,
          completion_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 ngày trước
          score: 85.5,
        },
        {
          user_id: employee1.user_id,
          course_id: courses[1].course_id, // Cơ sở dữ liệu
          status: CourseStatus.IN_PROGRESS,
          completion_date: null,
          score: null,
        },
        {
          user_id: employee2.user_id,
          course_id: courses[0].course_id, // Giới thiệu về lập trình
          status: CourseStatus.IN_PROGRESS,
          completion_date: null,
          score: null,
        },
        {
          user_id: teamLead.user_id,
          course_id: courses[3].course_id, // Nguyên tắc quản lý dự án
          status: CourseStatus.COMPLETED,
          completion_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 ngày trước
          score: 92.0,
        },
      ];
      
      await this.userCoursesRepository.save(userCourses);
      console.log('User courses seeded successfully');
    }
  }

  private async seedAttendance(users: User[]) {
    const attendanceCount = await this.attendanceRepository.count();
    if (attendanceCount === 0 && users.length >= 3) {
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      const employee2 = users.find(u => u.email === 'employee2@example.com');
      
      if (!employee1 || !employee2) return;
      
      // Tạo dữ liệu chấm công trong 7 ngày gần đây
      const attendances = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Bỏ qua ngày cuối tuần
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 0: Chủ Nhật, 6: Thứ Bảy
        
        // Tạo check-in, check-out cho employee1
        const checkInTime1 = new Date(date);
        checkInTime1.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        
        const checkOutTime1 = new Date(date);
        checkOutTime1.setHours(17, 30 + Math.floor(Math.random() * 30), 0, 0);
        
        const overtimeHours1 = (checkOutTime1.getTime() - (new Date(date).setHours(17, 30, 0, 0))) / (1000 * 60 * 60);
        
        attendances.push({
          user_id: employee1.user_id,
          check_in: checkInTime1,
          check_out: checkOutTime1,
          overtime_hours: Math.round(overtimeHours1 * 100) / 100,
        });
        
        // Tạo check-in, check-out cho employee2 (trừ một ngày để tạo dữ liệu nghỉ phép)
        if (i !== 3) { // Giả sử ngày thứ 3 employee2 xin nghỉ phép
          const checkInTime2 = new Date(date);
          checkInTime2.setHours(8, Math.floor(Math.random() * 30), 0, 0);
          
          const checkOutTime2 = new Date(date);
          checkOutTime2.setHours(17, 30 + Math.floor(Math.random() * 30), 0, 0);
          
          const overtimeHours2 = (checkOutTime2.getTime() - (new Date(date).setHours(17, 30, 0, 0))) / (1000 * 60 * 60);
          
          attendances.push({
            user_id: employee2.user_id,
            check_in: checkInTime2,
            check_out: checkOutTime2,
            overtime_hours: Math.round(overtimeHours2 * 100) / 100,
          });
        } else {
          // Ngày thứ 3 employee2 nghỉ phép
          const leaveDate = new Date(date);
          leaveDate.setHours(0, 0, 0, 0);
          
          attendances.push({
            user_id: employee2.user_id,
            leave_type: LeaveType.ANNUAL,
            leave_date: leaveDate,
            status: AttendanceStatus.APPROVED,
            note: 'Nghỉ phép thường niên',
          });
        }
      }
      
      // Tạo thêm một yêu cầu nghỉ phép đang chờ duyệt
      const pendingLeaveDate = new Date();
      pendingLeaveDate.setDate(pendingLeaveDate.getDate() + 3); // 3 ngày sau
      pendingLeaveDate.setHours(0, 0, 0, 0);
      
      attendances.push({
        user_id: employee1.user_id,
        leave_type: LeaveType.SICK,
        leave_date: pendingLeaveDate,
        status: AttendanceStatus.PENDING,
        note: 'Nghỉ ốm do sức khỏe không tốt',
      });
      
      await this.attendanceRepository.save(attendances);
      console.log('Attendance records seeded successfully');
    }
  }

  private async seedNotifications(users: User[]) {
    const notificationCount = await this.notificationRepository.count();
    if (notificationCount === 0 && users.length >= 3) {
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      const employee2 = users.find(u => u.email === 'employee2@example.com');
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      
      if (!employee1 || !employee2 || !teamLead) return;
      
      const notifications = [
        {
          user_id: employee1.user_id,
          title: 'Khóa học mới đã được gán',
          content: 'Bạn đã được gán vào khóa học "Cơ sở dữ liệu". Vui lòng kiểm tra và bắt đầu học.',
          type: NotificationType.TRAINING,
          is_read: true,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 ngày trước
        },
        {
          user_id: employee1.user_id,
          title: 'Nhiệm vụ mới',
          content: 'Bạn có một nhiệm vụ mới: "Báo cáo tiến độ dự án hàng tuần"',
          type: NotificationType.TASK,
          is_read: false,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 ngày trước
        },
        {
          user_id: employee2.user_id,
          title: 'Yêu cầu nghỉ phép đã được chấp nhận',
          content: 'Yêu cầu nghỉ phép thường niên của bạn đã được chấp nhận',
          type: NotificationType.GENERAL,
          is_read: false,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 ngày trước
        },
        {
          user_id: teamLead.user_id,
          title: 'Bài đăng mới trong diễn đàn',
          content: 'Có một bài đăng mới từ Nguyễn Văn A trong diễn đàn: "Câu hỏi về quy trình làm việc mới"',
          type: NotificationType.GENERAL,
          is_read: false,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 ngày trước
        },
      ];
      
      await this.notificationRepository.save(notifications);
      console.log('Notifications seeded successfully');
    }
  }

  private async seedAssignments(courses: Course[]) {
    const assignmentCount = await this.assignmentRepository.count();
    if (assignmentCount === 0 && courses.length > 0) {
      const assignments = [
        {
          course_id: courses[0].course_id, // Giới thiệu về lập trình
          title: 'Bài tập về biến và kiểu dữ liệu',
          description: 'Làm các bài tập về khai báo biến, sử dụng các kiểu dữ liệu cơ bản và thao tác với biến',
          max_submissions: 3,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 tuần sau
          created_at: new Date(),
        },
        {
          course_id: courses[0].course_id, // Giới thiệu về lập trình
          title: 'Bài tập về cấu trúc điều khiển',
          description: 'Làm các bài tập về cấu trúc rẽ nhánh (if-else), vòng lặp (for, while) và switch-case',
          max_submissions: 3,
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 tuần sau
          created_at: new Date(),
        },
        {
          course_id: courses[1].course_id, // Cơ sở dữ liệu
          title: 'Thiết kế cơ sở dữ liệu',
          description: 'Thiết kế cơ sở dữ liệu cho một cửa hàng trực tuyến đơn giản',
          max_submissions: 2,
          deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 ngày sau
          created_at: new Date(),
        },
        {
          course_id: courses[3].course_id, // Nguyên tắc quản lý dự án
          title: 'Lập kế hoạch dự án',
          description: 'Lập kế hoạch chi tiết cho một dự án phát triển phần mềm theo phương pháp Waterfall',
          max_submissions: 1,
          deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 tuần sau
          created_at: new Date(),
        },
      ];
      
      await this.assignmentRepository.save(assignments);
      console.log('Assignments seeded successfully');
    }
    return await this.assignmentRepository.find();
  }

  private async seedSubmissions(users: User[], assignments: Assignment[]) {
    const submissionCount = await this.submissionRepository.count();
    if (submissionCount === 0 && users.length >= 3 && assignments.length >= 2) {
      const employee1 = users.find(u => u.email === 'employee1@example.com');
      const employee2 = users.find(u => u.email === 'employee2@example.com');
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      
      if (!employee1 || !employee2 || !teamLead) return;
      
      const submissions = [
        {
          assignment_id: assignments[0].assignment_id, // Bài tập về biến và kiểu dữ liệu
          user_id: employee1.user_id,
          submission_content: `// Bài 1: Khai báo biến
const name = "Nguyễn Văn A";
let age = 30;
const PI = 3.14159;

// Bài 2: Sử dụng các kiểu dữ liệu
const isStudent = false;
const grades = [8, 9, 7, 10];
const person = {
  name: "Nguyễn Văn A",
  age: 30,
  job: "Developer"
};

// Bài 3: Thao tác với biến
let x = 10;
let y = 5;
console.log(x + y); // 15
console.log(x - y); // 5
console.log(x * y); // 50
console.log(x / y); // 2`,
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 ngày trước
          testcase_passed: 8,
          total_testcases: 10,
        },
        {
          assignment_id: assignments[1].assignment_id, // Bài tập về cấu trúc điều khiển
          user_id: employee1.user_id,
          submission_content: `// Bài 1: Cấu trúc if-else
function checkAge(age) {
  if (age < 18) {
    return "Chưa đủ tuổi";
  } else if (age >= 18 && age < 65) {
    return "Tuổi trưởng thành";
  } else {
    return "Tuổi nghỉ hưu";
  }
}

// Bài 2: Vòng lặp for
function sumNumbers(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

// Bài 3: Vòng lặp while
function countDigits(number) {
  let count = 0;
  while (number > 0) {
    count++;
    number = Math.floor(number / 10);
  }
  return count;
}`,
          submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 ngày trước
          testcase_passed: 5,
          total_testcases: 8,
        },
        {
          assignment_id: assignments[0].assignment_id, // Bài tập về biến và kiểu dữ liệu
          user_id: employee2.user_id,
          submission_content: `// Bài tập về biến và kiểu dữ liệu
// Khai báo biến
let fullName = "Phạm Thị D";
let studentId = "SV001";
let currentYear = 2023;

// Các kiểu dữ liệu
// Kiểu số
let age = 25;
let score = 8.5;

// Kiểu chuỗi
let address = "Hà Nội";
let department = "CNTT";

// Kiểu boolean
let isGraduated = false;
let hasCertificate = true;

// Kiểu mảng
let scores = [9, 8, 7, 8.5, 9.5];
let subjects = ["Toán", "Lý", "Hóa"];

// Tính điểm trung bình
function calculateAverage(scores) {
  let sum = 0;
  for (let i = 0; i < scores.length; i++) {
    sum += scores[i];
  }
  return sum / scores.length;
}

let averageScore = calculateAverage(scores);
console.log("Điểm trung bình: " + averageScore);`,
          submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 ngày trước
          testcase_passed: 7,
          total_testcases: 10,
        },
      ];
      
      await this.submissionRepository.save(submissions);
      console.log('Submissions seeded successfully');
    }
  }

  private async seedDocuments(users: User[]) {
    const documentCount = await this.documentRepository.count();
    if (documentCount === 0 && users.length >= 3) {
      const admin = users.find(u => u.role === UserRole.ADMIN);
      const teamLead = users.find(u => u.role === UserRole.TEAM_LEADER);
      
      if (!admin || !teamLead) return;
      
      const documents = [
        {
          title: 'Nội quy công ty',
          file_url: 'documents/company-rules.pdf',
          category: 'Nội quy',
          uploaded_by: admin.user_id,
          uploaded_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
        },
        {
          title: 'Hướng dẫn sử dụng phần mềm quản lý dự án',
          file_url: 'documents/project-management-guide.pdf',
          category: 'Hướng dẫn',
          uploaded_by: teamLead.user_id,
          uploaded_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 ngày trước
        },
        {
          title: 'Kế hoạch đào tạo năm 2023',
          file_url: 'documents/training-plan-2023.xlsx',
          category: 'Kế hoạch',
          uploaded_by: admin.user_id,
          uploaded_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 ngày trước
        },
        {
          title: 'Mẫu báo cáo dự án',
          file_url: 'documents/project-report-template.docx',
          category: 'Mẫu',
          uploaded_by: teamLead.user_id,
          uploaded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 ngày trước
        },
        {
          title: 'Giới thiệu công ty',
          file_url: 'documents/company-intro.pptx',
          category: 'Giới thiệu',
          uploaded_by: admin.user_id,
          uploaded_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 ngày trước
        },
      ];
      
      await this.documentRepository.save(documents);
      console.log('Documents seeded successfully');
    }
  }
}