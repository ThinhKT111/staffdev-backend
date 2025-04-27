// src/calendar/calendar.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { User } from '../entities/user.entity';
import { Assignment } from '../entities/assignment.entity';
import { Course } from '../entities/course.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async getUserCalendar(userId: number, startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Lấy thông tin người dùng
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      relations: ['department']
    });
    
    // Lấy nhiệm vụ của người dùng
    const tasks = await this.taskRepository.find({
      where: {
        assigned_to: userId,
        deadline: Between(start, end)
      }
    });
    
    // Lấy lịch điểm danh của người dùng
    const attendance = await this.attendanceRepository.find({
      where: [
        { user_id: userId, check_in: Between(start, end) },
        { user_id: userId, leave_date: Between(start, end) }
      ]
    });
    
    // Lấy deadline nộp bài tập
    const assignments = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('submissions', 'submission', 'submission.assignment_id = assignment.assignment_id')
      .where('submission.user_id = :userId', { userId })
      .andWhere('assignment.deadline BETWEEN :start AND :end', { start, end })
      .getMany();
    
    // Chuyển đổi thành sự kiện lịch
    const events = [];
    
    // Thêm sự kiện từ nhiệm vụ
    tasks.forEach(task => {
      events.push({
        id: `task-${task.task_id}`,
        title: task.title,
        start: task.deadline,
        end: task.deadline,
        type: 'task',
        status: task.status,
        description: task.description
      });
    });
    
    // Thêm sự kiện từ điểm danh
    attendance.forEach(record => {
      if (record.check_in) {
        events.push({
          id: `checkin-${record.attendance_id}`,
          title: 'Điểm danh',
          start: record.check_in,
          end: record.check_out || new Date(record.check_in.getTime() + 9 * 60 * 60 * 1000),
          type: 'attendance',
          description: 'Điểm danh làm việc'
        });
      }
      
      if (record.leave_date) {
        events.push({
          id: `leave-${record.attendance_id}`,
          title: `Nghỉ phép ${record.leave_type}`,
          start: record.leave_date,
          end: record.leave_date,
          type: 'leave',
          status: record.status,
          description: record.note
        });
      }
    });
    
    // Thêm sự kiện từ bài tập
    assignments.forEach(assignment => {
      events.push({
        id: `assignment-${assignment.assignment_id}`,
        title: `Deadline: ${assignment.title}`,
        start: assignment.deadline,
        end: assignment.deadline,
        type: 'assignment',
        description: assignment.description
      });
    });
    
    return {
      userId,
      userName: user.full_name,
      department: user.department?.department_name,
      events
    };
  }

  async getDepartmentCalendar(departmentId: number, startDate: string, endDate: string): Promise<any> {
    // Lấy danh sách người dùng trong phòng ban
    const users = await this.userRepository.find({
      where: { department_id: departmentId }
    });
    
    // Lấy lịch của từng người dùng và gộp lại
    const userCalendars = await Promise.all(
      users.map(user => this.getUserCalendar(user.user_id, startDate, endDate))
    );
    
    // Gộp tất cả sự kiện
    const allEvents = userCalendars.flatMap(calendar => 
      calendar.events.map(event => ({
        ...event,
        userName: calendar.userName
      }))
    );
    
    // Lấy thông tin phòng ban
    const department = await this.userRepository.findOne({
      where: { department_id: departmentId }
    });
    
    return {
      departmentId,
      departmentName: department?.department_name,
      totalUsers: users.length,
      events: allEvents
    };
  }
}