// src/productivity/productivity.controller.ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ProductivityService } from './productivity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('productivity')
@UseGuards(JwtAuthGuard)
export class ProductivityController {
  constructor(private readonly productivityService: ProductivityService) {}

  @Get('personal')
  getPersonalProductivity(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.productivityService.getPersonalProductivity(
      req.user.userId,
      startDate,
      endDate
    );
  }

  @Get('team/:departmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  getTeamProductivity(
    @Param('departmentId') departmentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.productivityService.getTeamProductivity(
      +departmentId,
      startDate,
      endDate
    );
  }
}