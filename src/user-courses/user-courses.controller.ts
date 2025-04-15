// src/user-courses/user-courses.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { UserCoursesService } from './user-courses.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('user-courses')
@UseGuards(JwtAuthGuard)
export class UserCoursesController {
  constructor(private readonly userCoursesService: UserCoursesService) {}

  @Get()
  findAll(@Query('userId') userId?: string, @Query('courseId') courseId?: string) {
    if (userId) {
      return this.userCoursesService.findByUser(+userId);
    }
    
    if (courseId) {
      return this.userCoursesService.findByCourse(+courseId);
    }
    
    return this.userCoursesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userCoursesService.findOne(+id);
  }

  @Post('enroll')
  enrollCourse(@Body() enrollCourseDto: EnrollCourseDto, @Request() req) {
    // Use current user if userId not provided
    if (!enrollCourseDto.userId) {
      enrollCourseDto.userId = req.user.userId;
    }
    
    return this.userCoursesService.enrollCourse(enrollCourseDto);
  }

  @Patch('progress/:userId/:courseId')
  updateProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
    @Body() updateProgressDto: UpdateProgressDto
  ) {
    return this.userCoursesService.updateProgress(+userId, +courseId, updateProgressDto);
  }

  @Delete(':userId/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  removeCourse(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    return this.userCoursesService.removeCourse(+userId, +courseId);
  }

  @Get('statistics/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  getEnrollmentStatistics(@Param('courseId') courseId: string) {
    return this.userCoursesService.getEnrollmentStatistics(+courseId);
  }
}