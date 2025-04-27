// src/productivity/productivity.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { User } from '../entities/user.entity';
import { Submission } from '../entities/submission.entity';

@Injectable()
export class ProductivityService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
  ) {}

  async getPersonalProductivity(userId: number, startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    
    // Lấy thông tin người dùng
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      relations: ['department']
    });
    
    // Đếm số ngày làm việc
    const attendanceRecords = await this.attendanceRepository.find({
      where: {
        user_id: userId,
        check_in: Between(start, end)
      }
    });
    
    // Tính tổng số giờ làm việc và số giờ tăng ca
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    
    for (const record of attendanceRecords) {
      if (record.check_in && record.check_out) {
        const checkIn = new Date(record.check_in);
        const checkOut = new Date(record.check_out);
        const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        
        totalWorkHours += workHours;
        
        if (record.overtime_hours) {
          totalOvertimeHours += record.overtime_hours;
        }
      }
    }
    
    // Đếm số nhiệm vụ hoàn thành
    const completedTasks = await this.taskRepository.find({
      where: {
        assigned_to: userId,
        status: TaskStatus.COMPLETED,
        updated_at: Between(start, end)
      }
    });
    
    // Tính điểm trung bình của các nhiệm vụ
    const avgTaskScore = completedTasks.reduce((sum, task) => sum + (task.score || 0), 0) / (completedTasks.length || 1);
    
    // Đếm số bài nộp
    const submissions = await this.submissionRepository.find({
      where: {
        user_id: userId,
        submitted_at: Between(start, end)
      }
    });
    
    // Tính tỷ lệ đạt (testcase_passed/total_testcases)
    let passRate = 0;
    let totalTestcases = 0;
    let passedTestcases = 0;
    
    for (const submission of submissions) {
      if (submission.total_testcases) {
        totalTestcases += submission.total_testcases;
        passedTestcases += submission.testcase_passed || 0;
      }
    }
    
    if (totalTestcases > 0) {
      passRate = (passedTestcases / totalTestcases) * 100;
    }
    
    // Tính toán năng suất tổng thể (điểm số tương đối)
    const productivity = {
      workDays: attendanceRecords.length,
      totalWorkHours,
      totalOvertimeHours,
      completedTasks: completedTasks.length,
      avgTaskScore,
      submissionCount: submissions.length,
      passRate,
      // Điểm năng suất: Công thức tham khảo
      productivityScore: (
        (completedTasks.length * 10) + 
        (avgTaskScore * 0.5) + 
        (totalWorkHours * 0.3) +
        (passRate * 0.1)
      )
    };
    
    return {
      userId,
      userName: user?.full_name || 'Unknown',
      department: user?.department?.department_name || 'Unknown',
      period: { startDate, endDate },
      productivity
    };
  }

  async getTeamProductivity(departmentId: number, startDate: string, endDate: string): Promise<any> {
    // Lấy tất cả nhân viên trong phòng ban
    const users = await this.userRepository.find({
      where: { department_id: departmentId }
    });
    
    // Lấy năng suất từng người
    const userProductivities = await Promise.all(
      users.map(user => this.getPersonalProductivity(user.user_id, startDate, endDate))
    );
    
    // Tính toán số liệu trung bình của phòng ban
    const totalWorkDays = userProductivities.reduce((sum, p) => sum + p.productivity.workDays, 0);
    const totalWorkHours = userProductivities.reduce((sum, p) => sum + p.productivity.totalWorkHours, 0);
    const totalCompletedTasks = userProductivities.reduce((sum, p) => sum + p.productivity.completedTasks, 0);
    const avgProductivityScore = userProductivities.reduce((sum, p) => sum + p.productivity.productivityScore, 0) / users.length;
    
    // Xếp hạng nhân viên theo năng suất
    const rankedUsers = userProductivities
      .sort((a, b) => b.productivity.productivityScore - a.productivity.productivityScore)
      .map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        userName: p.userName,
        productivityScore: p.productivity.productivityScore,
        completedTasks: p.productivity.completedTasks
      }));
    
    return {
      departmentId,
      departmentName: users[0]?.department?.department_name || 'Unknown',
      period: { startDate, endDate },
      teamSize: users.length,
      summary: {
        totalWorkDays,
        totalWorkHours,
        totalCompletedTasks,
        avgProductivityScore,
        avgTasksPerUser: totalCompletedTasks / users.length
      },
      rankedUsers
    };
  }
}