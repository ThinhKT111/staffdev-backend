// src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

@Injectable()
export class ReportsService {
  getTrainingReport(startDate: string, endDate: string) {
    throw new Error('Method not implemented.');
  }
  getTaskReport(startDate: string, endDate: string, arg2: number | undefined) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
    
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getAttendanceReport(startDate: string, endDate: string, departmentId?: number) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    
    // Tạo truy vấn cơ bản
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .where('(attendance.check_in BETWEEN :start AND :end OR attendance.leave_date BETWEEN :start AND :end)', 
        { start, end });
    
    // Thêm điều kiện phòng ban nếu có
    if (departmentId) {
      query.andWhere('user.department_id = :departmentId', { departmentId });
    }
    
    const attendances = await query.getMany();
    
    // Tính toán thống kê
    const totalCheckIns = attendances.filter(a => a.check_in).length;
    const totalLeaves = attendances.filter(a => a.leave_type).length;
    const totalApprovedLeaves = attendances.filter(a => a.leave_type && a.status === 'approved').length;
    const totalRejectedLeaves = attendances.filter(a => a.leave_type && a.status === 'rejected').length;
    
    // Tính toán thống kê theo người dùng
    const userStats = {};
    
    for (const attendance of attendances) {
      const userId = attendance.user_id;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          fullName: attendance.user?.full_name,
          department: attendance.user?.department?.department_name,
          checkIns: 0,
          leaves: 0,
          overtimeHours: 0,
        };
      }
      
      if (attendance.check_in) {
        userStats[userId].checkIns++;
        if (attendance.overtime_hours) {
          userStats[userId].overtimeHours += +attendance.overtime_hours;
        }
      }
      
      if (attendance.leave_type) {
        userStats[userId].leaves++;
      }
    }
    
    return {
      period: { startDate, endDate },
      summary: {
        totalCheckIns,
        totalLeaves,
        totalApprovedLeaves,
        totalRejectedLeaves
      },
      userStatistics: Object.values(userStats)
    };
  }

  async exportAttendanceReport(
    startDate: string, 
    endDate: string, 
    departmentId?: number, 
    format: 'excel' | 'csv' = 'excel'
  ): Promise<Readable> {
    // Lấy dữ liệu báo cáo
    const reportData = await this.getAttendanceReport(startDate, endDate, departmentId);
    
    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');
    
    // Thêm tiêu đề
    worksheet.addRow([`Báo cáo chuyên cần từ ${startDate} đến ${endDate}`]);
    worksheet.addRow([]);
    
    // Tổng quan
    worksheet.addRow(['Tổng quan']);
    worksheet.addRow(['Tổng số điểm danh', reportData.summary.totalCheckIns]);
    worksheet.addRow(['Tổng số đơn nghỉ phép', reportData.summary.totalLeaves]);
    worksheet.addRow(['Đơn nghỉ phép được chấp nhận', reportData.summary.totalApprovedLeaves]);
    worksheet.addRow(['Đơn nghỉ phép bị từ chối', reportData.summary.totalRejectedLeaves]);
    worksheet.addRow([]);
    
    // Chi tiết người dùng
    worksheet.addRow(['Chi tiết theo người dùng']);
    worksheet.addRow(['ID', 'Họ tên', 'Phòng ban', 'Số lần điểm danh', 'Số đơn nghỉ phép', 'Giờ tăng ca']);
    
    reportData.userStatistics.forEach(user => {
      worksheet.addRow([
        user.userId,
        user.fullName,
        user.department,
        user.checkIns,
        user.leaves,
        user.overtimeHours
      ]);
    });
    
    // Tạo buffer
    const buffer = await (format === 'excel' ? 
      workbook.xlsx.writeBuffer() : 
      workbook.csv.writeBuffer());
    
    // Tạo stream từ buffer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    
    return stream;
  }

  // Thêm các phương thức báo cáo khác (getTrainingReport, getTaskReport) tương tự
}