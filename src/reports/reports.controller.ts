// src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards, Param, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { NotFoundException } from '@nestjs/common';

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

  @Get('attendance/export')
  async exportAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('departmentId') departmentId: string,
    @Query('format') format: 'excel' | 'csv' = 'excel'
  ) {
    return this.reportsService.exportAttendanceReport(
      startDate,
      endDate,
      departmentId ? +departmentId : undefined,
      format
    );
  }
  
  @Get('status/:jobId')
  async getReportStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getReportStatus(jobId);
  }
  
  @Get('download/:fileName')
  async downloadReport(@Param('fileName') fileName: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'reports', fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Report file not found');
    }
    
    const contentType = fileName.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}