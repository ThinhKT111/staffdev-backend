// src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  getAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('departmentId') departmentId?: string
  ) {
    return this.reportsService.getAttendanceReport(
      startDate,
      endDate,
      departmentId ? +departmentId : undefined
    );
  }

  @Get('trainings')
  getTrainingReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.reportsService.getTrainingReport(startDate, endDate);
  }

  @Get('tasks')
  getTaskReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('departmentId') departmentId?: string
  ) {
    return this.reportsService.getTaskReport(
      startDate,
      endDate,
      departmentId ? +departmentId : undefined
    );
  }

  @Get('attendance/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SENIOR_MANAGER)
  async exportAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('departmentId') departmentId: string,
    @Query('format') format: 'excel' | 'csv' = 'excel',
    @Res() res: Response
  ) {
    const report = await this.reportsService.exportAttendanceReport(
      startDate,
      endDate,
      departmentId ? +departmentId : undefined,
      format
    );
  
    const fileName = `attendance-report-${startDate}-to-${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
  
    res.setHeader('Content-Type', format === 'excel' ? 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
      'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  
    return report.pipe(res);
  }
}