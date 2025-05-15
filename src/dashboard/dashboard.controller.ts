// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

// Import the return type interfaces from the service
import { 
  StatsResult, 
  AttendanceStatsResult, 
  TrainingStatsResult 
} from './dashboard.interfaces';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getStats(): Promise<StatsResult> {
    return this.dashboardService.getStats();
  }

  @Get('attendance-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
  getAttendanceStats(): Promise<AttendanceStatsResult> {
    return this.dashboardService.getAttendanceStats();
  }

  @Get('training-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
  getTrainingStats(): Promise<TrainingStatsResult> {
    return this.dashboardService.getTrainingStats();
  }
  
  // Các phương thức sau cần được cập nhật để sử dụng các phương thức có sẵn hoặc được triển khai mới
  
  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getDashboardOverview(): Promise<StatsResult> {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.getStats();
  }
  
  @Get('forum-activity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getForumActivityStats(): Promise<StatsResult> {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.getStats();
  }
  
  @Get('document-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getDocumentStats(): Promise<StatsResult> {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.getStats();
  }
  
  @Get('task-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER, UserRole.TEAM_LEADER)
  getTaskStats(): Promise<StatsResult> {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.getStats();
  }
  
  @Get('user-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  getUserStats(): Promise<StatsResult> {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.getStats();
  }
  
  @Get('refresh')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  refreshAllStats() {
    // Sử dụng phương thức có sẵn
    return this.dashboardService.invalidateDashboardCache();
  }
  
  @Get('system-logs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getSystemLogs() {
    // Trả về thông báo tạm thời
    return {
      message: 'System logs feature is not implemented yet',
      logs: []
    };
  }
}