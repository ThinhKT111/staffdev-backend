// src/attendance/attendance.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { CheckInDto } from './dto/check-in.dto';
import { RequestLeaveDto } from './dto/request-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async findByUser(userId: number): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { user_id: userId },
      order: { 
        check_in: 'DESC',
        leave_date: 'DESC'
      },
    });
  }

  async findByDate(date: Date): Promise<Attendance[]> {
    // Get start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.attendanceRepository.find({
      where: [
        { 
          check_in: Between(startOfDay, endOfDay)
        },
        {
          leave_date: Between(startOfDay, endOfDay)
        }
      ],
    });
  }

  async findOne(id: number): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendance_id: id },
    });
    
    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }
    
    return attendance;
  }

  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already checked in today
    const existingRecord = await this.attendanceRepository.findOne({
      where: {
        user_id: checkInDto.userId,
        check_in: Between(today, new Date(today.getTime() + 24 * 60 * 60 * 1000))
      },
    });
    
    if (existingRecord) {
      return existingRecord;
    }
    
    // Create new check-in record
    const attendance = this.attendanceRepository.create({
      user_id: checkInDto.userId,
      check_in: new Date(),
    });
    
    return this.attendanceRepository.save(attendance);
  }

  async checkOut(userId: number): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's check-in record
    const record = await this.attendanceRepository.findOne({
      where: {
        user_id: userId,
        check_in: Between(today, new Date(today.getTime() + 24 * 60 * 60 * 1000))
      },
    });
    
    if (!record) {
      throw new BadRequestException('No check-in record found for today');
    }
    
    if (record.check_out) {
      return record; // Already checked out
    }
    
    // Calculate overtime if after 17:30
    const now = new Date();
    let overtimeHours = 0;
    
    if (now.getHours() >= 17 && (now.getHours() > 17 || now.getMinutes() >= 30)) {
      const standardEndTime = new Date();
      standardEndTime.setHours(17, 30, 0, 0);
      
      overtimeHours = (now.getTime() - standardEndTime.getTime()) / (1000 * 60 * 60);
      overtimeHours = Math.max(0, Math.round(overtimeHours * 100) / 100); // Round to 2 decimal places
    }
    
    // Update record with check-out time and overtime
    record.check_out = now;
    record.overtime_hours = overtimeHours;
    
    return this.attendanceRepository.save(record);
  }

  async requestLeave(leaveDto: RequestLeaveDto): Promise<Attendance> {
    const leaveDate = new Date(leaveDto.date);
    leaveDate.setHours(0, 0, 0, 0);
    
    // Check if already has a leave request for this date
    const existingRequest = await this.attendanceRepository.findOne({
      where: {
        user_id: leaveDto.userId,
        leave_date: Between(leaveDate, new Date(leaveDate.getTime() + 24 * 60 * 60 * 1000))
      },
    });
    
    if (existingRequest) {
      throw new BadRequestException('Leave request for this date already exists');
    }
    
    // Create new leave request
    const attendance = this.attendanceRepository.create({
      user_id: leaveDto.userId,
      leave_type: leaveDto.leaveType,
      leave_date: leaveDate,
      note: leaveDto.reason,
      status: 'pending',
    });
    
    return this.attendanceRepository.save(attendance);
  }

  async approveLeave(id: number): Promise<Attendance> {
    const leave = await this.findOne(id);
    
    if (!leave.leave_type) {
      throw new BadRequestException('This is not a leave request');
    }
    
    leave.status = 'approved';
    return this.attendanceRepository.save(leave);
  }

  async rejectLeave(id: number): Promise<Attendance> {
    const leave = await this.findOne(id);
    
    if (!leave.leave_type) {
      throw new BadRequestException('This is not a leave request');
    }
    
    leave.status = 'rejected';
    return this.attendanceRepository.save(leave);
  }

  async getStats(userId: number, month: number, year: number): Promise<any> {
    // Get start and end of month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Get all records for the user in the specified month
    const records = await this.attendanceRepository.find({
      where: [
        { 
          user_id: userId,
          check_in: Between(startOfMonth, endOfMonth)
        },
        {
          user_id: userId,
          leave_date: Between(startOfMonth, endOfMonth)
        }
      ],
    });
    
    // Calculate statistics
    const workDays = records.filter(r => r.check_in && r.check_out).length;
    
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    
    records.forEach(record => {
      if (record.check_in && record.check_out) {
        const checkIn = new Date(record.check_in);
        const checkOut = new Date(record.check_out);
        const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        
        totalWorkHours += workHours;
        
        if (record.overtime_hours) {
          totalOvertimeHours += record.overtime_hours;
        }
      }
    });
    
    const leaveDays = records.filter(r => r.leave_type).length;
    const approvedLeaves = records.filter(r => r.leave_type && r.status === 'approved').length;
    
    return {
      workDays,
      leaveDays,
      approvedLeaves,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalOvertimeHours,
    };
  }
}