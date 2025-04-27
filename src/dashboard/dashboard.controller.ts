// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
}