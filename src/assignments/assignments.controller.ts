// src/assignments/assignments.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@Query('courseId') courseId?: string) {
    if (courseId) {
      return this.assignmentsService.findByCourse(+courseId);
    }
    
    return this.assignmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(+id, updateAssignmentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(+id);
  }

  // Submissions
  @Get(':id/submissions')
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissions(+id);
  }

  @Get(':id/submissions/user/:userId')
  getUserSubmission(@Param('id') id: string, @Param('userId') userId: string) {
    return this.assignmentsService.getUserSubmission(+id, +userId);
  }

  @Post('submit')
  submitAssignment(@Body() createSubmissionDto: CreateSubmissionDto, @Request() req) {
    // Use current user if userId not provided
    if (!createSubmissionDto.userId) {
      createSubmissionDto.userId = req.user.userId;
    }
    
    return this.assignmentsService.submitAssignment(createSubmissionDto);
  }
}