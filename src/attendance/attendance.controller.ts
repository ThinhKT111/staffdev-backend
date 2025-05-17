// src/attendance/attendance.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { RequestLeaveDto } from './dto/request-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findByUser(@Query('userId') userId: string, @Request() req) {
    // Nếu không có userId trong query, sử dụng người dùng hiện tại
    if (!userId) {
      const currentUserId = req.user.userId || req.user.sub;
      const userIdNumber = Number(currentUserId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      return this.attendanceService.findByUser(userIdNumber);
    }
    
    return this.attendanceService.findByUser(+userId);
  }

  @Get('date')
  findByDate(@Query('date') dateString: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.attendanceService.findByDate(date);
  }

  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto, @Request() req) {
    // Use current user if userId not provided
    if (!checkInDto.userId) {
      const userId = req.user.userId || req.user.sub;
      const userIdNumber = Number(userId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      checkInDto.userId = userIdNumber;
    }
    
    return this.attendanceService.checkIn(checkInDto);
  }

  @Post('check-out')
  checkOut(@Body('userId') userId: number, @Request() req) {
    // Use current user if userId not provided
    if (!userId) {
      const currentUserId = req.user.userId || req.user.sub;
      const userIdNumber = Number(currentUserId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      return this.attendanceService.checkOut(userIdNumber);
    }
    
    return this.attendanceService.checkOut(userId);
  }

  @Post('leave')
  requestLeave(@Body() requestLeaveDto: RequestLeaveDto, @Request() req) {
    // Use current user if userId not provided
    if (!requestLeaveDto.userId) {
      const userId = req.user.userId || req.user.sub;
      const userIdNumber = Number(userId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      requestLeaveDto.userId = userIdNumber;
    }
    
    return this.attendanceService.requestLeave(requestLeaveDto);
  }

  @Post('leave/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  approveLeave(@Param('id') id: string) {
    return this.attendanceService.approveLeave(+id);
  }

  @Post('leave/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  rejectLeave(@Param('id') id: string) {
    return this.attendanceService.rejectLeave(+id);
  }

  @Get('stats')
  getStats(
    @Query('userId') userId: string, 
    @Query('month') month: string, 
    @Query('year') year: string,
    @Request() req
  ) {
    // Use current user if userId not provided
    let userIdToUse;
    
    if (userId) {
      userIdToUse = +userId;
    } else {
      const currentUserId = req.user.userId || req.user.sub;
      userIdToUse = Number(currentUserId);
      
      if (isNaN(userIdToUse)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
    }
    
    const currentDate = new Date();
    const monthToUse = month ? +month : currentDate.getMonth() + 1;
    const yearToUse = year ? +year : currentDate.getFullYear();
    
    return this.attendanceService.getStats(userIdToUse, monthToUse, yearToUse);
  }
}