// src/reports/reports.service.ts
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { UserCourse } from '../entities/user-course.entity';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { QueueService } from '../shared/services/queue.service';

@Injectable()
export class ReportsService implements OnModuleInit {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
    
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    private queueService: QueueService,
  ) {}
  
  onModuleInit() {
    // Khởi động worker xử lý báo cáo
    this.queueService.startWorker('export_report', this.processReportExport.bind(this));
  }

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
    const userStats: Record<number, any> = {};
    
    for (const attendance of attendances) {
      if (attendance.user) {
        const userId = attendance.user.user_id;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            userId,
            fullName: attendance.user.full_name,
            department: attendance.user.department?.department_name,
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

  // Thêm phương thức để xử lý báo cáo từ queue
  private async processReportExport(data: any): Promise<any> {
    const { reportType, startDate, endDate, departmentId, format } = data;
    
    // Xử lý xuất báo cáo dựa trên loại
    if (reportType === 'attendance') {
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
      
      reportData.userStatistics.forEach((user: any) => {
        worksheet.addRow([
          user.userId,
          user.fullName,
          user.department,
          user.checkIns,
          user.leaves,
          user.overtimeHours
        ]);
      });
      
      // Đảm bảo thư mục tồn tại
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Tạo tên file và đường dẫn
      const timestamp = Date.now();
      const fileName = `attendance-report-${startDate}-to-${endDate}-${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      const filePath = path.join(reportsDir, fileName);
      
      // Lưu file
      if (format === 'excel') {
        await workbook.xlsx.writeFile(filePath);
      } else {
        await workbook.csv.writeFile(filePath);
      }
      
      // Trả về thông tin file
      return {
        fileName,
        filePath: `/reports/${fileName}`,
        format,
        url: `/api/reports/download/${fileName}`,
        timestamp,
      };
    }
    
    throw new Error(`Unsupported report type: ${reportType}`);
  }

  // Cập nhật phương thức xuất báo cáo để sử dụng queue
  async exportAttendanceReport(
    startDate: string,
    endDate: string,
    departmentId?: number,
    format: 'excel' | 'csv' = 'excel'
  ): Promise<any> {
    const jobId = await this.queueService.enqueue('export_report', {
      reportType: 'attendance',
      startDate,
      endDate,
      departmentId,
      format,
    });
    
    return {
      message: 'Report generation has been queued',
      jobId,
      status: 'pending',
    };
  }

  // Phương thức kiểm tra trạng thái báo cáo
  async getReportStatus(jobId: string): Promise<any> {
    return this.queueService.getJob(jobId);
  }
}