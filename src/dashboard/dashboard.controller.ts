// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards, Query, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getDashboardOverview();
  }

  @Get('forum-stats')
  getForumStats(@Query('days') days: string = '30') {
    return this.dashboardService.getForumActivityStats(parseInt(days, 10));
  }

  @Get('document-stats')
  getDocumentStats(@Query('days') days: string = '30') {
    return this.dashboardService.getDocumentStats(parseInt(days, 10));
  }

  @Get('task-stats')
  getTaskStats(@Query('days') days: string = '30') {
    return this.dashboardService.getTaskStats(parseInt(days, 10));
  }

  @Get('training-stats')
  getTrainingStats(@Query('days') days: string = '30') {
    return this.dashboardService.getTrainingStats(parseInt(days, 10));
  }

  @Get('attendance-stats')
  getAttendanceStats(@Query('days') days: string = '30') {
    return this.dashboardService.getAttendanceStats(parseInt(days, 10));
  }

  @Get('user-stats')
  getUserStats() {
    return this.dashboardService.getUserStats();
  }

  @Post('refresh')
  refreshDashboardData() {
    return this.dashboardService.refreshAllStats();
  }

  @Get('logs')
  @Roles(UserRole.ADMIN)
  getSystemLogs(
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '50'
  ) {
    return this.dashboardService.getSystemLogs(
      level,
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(size, 10)
    );
  }
}