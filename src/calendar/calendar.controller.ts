// src/calendar/calendar.controller.ts
import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  getUserCalendar(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string
  ) {
    // Nếu không có userId hoặc không phải admin/manager thì lấy lịch của người dùng hiện tại
    const userIdToUse = (userId && (
      req.user.role === 'Admin' || 
      req.user.role === 'TeamLeader' || 
      req.user.role === 'SeniorManager'
    )) ? +userId : req.user.userId;
    
    return this.calendarService.getUserCalendar(
      userIdToUse,
      startDate,
      endDate
    );
  }

  @Get('department/:departmentId/events')
  getDepartmentCalendar(
    @Param('departmentId') departmentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.calendarService.getDepartmentCalendar(
      +departmentId,
      startDate,
      endDate
    );
  }
}