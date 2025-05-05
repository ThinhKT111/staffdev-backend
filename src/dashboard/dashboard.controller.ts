// src/dashboard/dashboard.controller.ts
import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getDashboardOverview() {
    return this.dashboardService.getDashboardOverview();
  }

  @Get('forum')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getForumActivityStats() {
    return this.dashboardService.getForumActivityStats();
  }

  @Get('documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getDocumentStats() {
    return this.dashboardService.getDocumentStats();
  }

  @Get('tasks')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getTaskStats() {
    return this.dashboardService.getTaskStats();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('attendance-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
  getAttendanceStats() {
    return this.dashboardService.getAttendanceStats();
  }

  @Get('training-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
  getTrainingStats() {
    return this.dashboardService.getTrainingStats();
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getUserStats() {
    return this.dashboardService.getUserStats();
  }

  @Post('refresh')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  refreshAllStats() {
    return this.dashboardService.refreshAllStats();
  }
  
  @Get('system-logs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getSystemLogs() {
    return this.dashboardService.getSystemLogs();
  }
}