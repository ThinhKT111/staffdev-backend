// src/notifications/notifications.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request as NestRequest } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { BulkCreateNotificationDto } from './dto/bulk-create-notification.dto';
import { NotificationType } from 'src/entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    if (userId) {
      return this.notificationsService.findByUser(+userId);
    }
    
    return this.notificationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@NestRequest() req): Promise<{ count: number }> {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('paginated')
  @UseGuards(JwtAuthGuard)
  async getPaginated(
    @NestRequest() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10
  ) {
    const userId = req.user.userId;
    return this.notificationsService.findByUserPaginated(userId, page, pageSize);
  }

  @Post('read-multiple')
  @UseGuards(JwtAuthGuard)
  async markMultipleAsRead(
    @NestRequest() req,
    @Body() { notificationIds }: { notificationIds: number[] }
  ) {
    const userId = req.user.userId;
    await this.notificationsService.markMultipleAsRead(userId, notificationIds);
    return { success: true };
  }

  @Get('by-type/:type')
  @UseGuards(JwtAuthGuard)
  async getByType(
    @NestRequest() req,
    @Param('type') type: string
  ) {
    const userId = req.user.userId;
    let notificationType: NotificationType;
    
    switch (type) {
      case 'task':
        notificationType = NotificationType.TASK;
        break;
      case 'training':
        notificationType = NotificationType.TRAINING;
        break;
      case 'assignment':
        notificationType = NotificationType.ASSIGNMENT;
        break;
      default:
        notificationType = NotificationType.GENERAL;
    }
    
    return this.notificationsService.findByType(userId, notificationType);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  createBulk(@Body() bulkCreateDto: BulkCreateNotificationDto) {
    return this.notificationsService.createBulk(bulkCreateDto);
  }

  @Post('department/:departmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  createForDepartment(
    @Param('departmentId') departmentId: string,
    @Body() createNotificationDto: CreateNotificationDto
  ) {
    const { title, content, type } = createNotificationDto;
    return this.notificationsService.createForDepartment(
      +departmentId,
      title,
      content,
      type
    );
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Body() markAsReadDto: MarkAsReadDto) {
    return this.notificationsService.markAsRead(+id, markAsReadDto);
  }

  @Post('user/:userId/mark-all-read')
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(+userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}