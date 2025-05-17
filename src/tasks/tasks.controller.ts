// src/tasks/tasks.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FeedbackTaskDto } from './dto/feedback-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query('assignedTo') assignedTo?: string, @Query('assignedBy') assignedBy?: string) {
    if (assignedTo) {
      return this.tasksService.findByAssignedTo(+assignedTo);
    }
    
    if (assignedBy) {
      return this.tasksService.findByAssignedBy(+assignedBy);
    }
    
    return this.tasksService.findAll();
  }

  @Get('me')
  findMyTasks(@Request() req) {
    // Lấy userId từ JWT payload - có thể là req.user.userId hoặc req.user.sub
    const userId = req.user.userId || req.user.sub;
    
    // Đảm bảo userId là số nguyên hợp lệ
    if (!userId || isNaN(+userId)) {
      throw new Error('User ID không hợp lệ');
    }
    
    return this.tasksService.findByAssignedTo(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    // Set the current user as the assigner if not specified
    if (!createTaskDto.assignedBy) {
      const userId = req.user.userId || req.user.sub;
      const userIdNumber = Number(userId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      createTaskDto.assignedBy = userIdNumber;
    }
    
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tasksService.updateStatus(+id, status);
  }

  @Post(':id/feedback')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  provideFeedback(@Param('id') id: string, @Body() feedbackDto: FeedbackTaskDto) {
    return this.tasksService.provideFeedback(+id, feedbackDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
  
  // Endpoint mới: Lấy tổng quan nhiệm vụ
  @Get('summary/me')
  async getMySummary(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const userIdNumber = Number(userId);
    
    if (isNaN(userIdNumber)) {
      throw new Error('User ID không phải là số hợp lệ');
    }
    
    await this.tasksService.sendTaskSummary(userIdNumber);
    return { message: 'Task summary notification has been sent' };
  }
  
  // Endpoint mới: Thông báo deadline sắp đến hạn (cho testing)
  @Post('notify/upcoming-deadlines')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async notifyUpcomingDeadlines(@Body('hoursThreshold') hoursThreshold: number = 24) {
    await this.tasksService.notifyUpcomingDeadlines(hoursThreshold);
    return { message: 'Notifications for upcoming deadlines have been sent' };
  }
  
  // Endpoint mới: Thông báo nhiệm vụ quá hạn (cho testing)
  @Post('notify/overdue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async notifyOverdueTasks() {
    await this.tasksService.notifyOverdueTasks();
    return { message: 'Notifications for overdue tasks have been sent' };
  }
}