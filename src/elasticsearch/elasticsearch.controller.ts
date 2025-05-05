// src/elasticsearch/elasticsearch.controller.ts
import { Controller, Get, Post, Query, Body, UseGuards, Param } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('elasticsearch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ElasticsearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Get('search/forum')
  async searchForum(
    @Query('query') query: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchForumPosts(
      query,
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('search/comments')
  async searchComments(
    @Query('query') query: string,
    @Query('postId') postId?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchForumComments(
      query,
      postId ? parseInt(postId, 10) : undefined,
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('search/documents')
  async searchDocuments(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchDocuments(
      query,
      category,
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('search/notifications')
  async searchNotifications(
    @Query('query') query: string,
    @Query('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchNotifications(
      query,
      parseInt(userId, 10),
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('search/tasks')
  async searchTasks(
    @Query('query') query: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchTasks(
      query,
      status,
      userId ? parseInt(userId, 10) : undefined,
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('search/users')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  async searchUsers(
    @Query('query') query: string,
    @Query('role') role?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ) {
    const result = await this.elasticsearchService.searchUsers(
      query,
      role,
      departmentId ? parseInt(departmentId, 10) : undefined,
      parseInt(page, 10),
      parseInt(size, 10),
    );
    
    return result;
  }

  @Get('dashboard/overview')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  async getDashboardOverview() {
    return this.elasticsearchService.getDashboardOverview();
  }

  @Get('stats/forum')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  async getForumStats(@Query('days') days: string = '30') {
    return this.elasticsearchService.getForumActivityStats(parseInt(days, 10));
  }

  @Get('stats/documents')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  async getDocumentsStats(@Query('days') days: string = '30') {
    return this.elasticsearchService.getDocumentsStats(parseInt(days, 10));
  }

  @Get('stats/tasks')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  async getTasksStats(@Query('days') days: string = '30') {
    return this.elasticsearchService.getTasksStats(parseInt(days, 10));
  }

  @Get('logs')
  @Roles(UserRole.ADMIN)
  async getSystemLogs(
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('size') size: string = '100',
  ) {
    return this.elasticsearchService.getSystemLogs(
      level,
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(size, 10),
    );
  }

  @Post('sync/all')
  @Roles(UserRole.ADMIN)
  async syncAll() {
    await Promise.all([
      this.elasticsearchService.syncForumPosts(),
      this.elasticsearchService.syncDocuments(),
      this.elasticsearchService.syncTasks(),
      this.elasticsearchService.syncNotifications(),
      this.elasticsearchService.syncUsers(),
    ]);
    
    return { message: 'Đồng bộ hóa dữ liệu với Elasticsearch đã được bắt đầu.' };
  }

  @Post('sync/forum')
  @Roles(UserRole.ADMIN)
  async syncForum() {
    await this.elasticsearchService.syncForumPosts();
    return { message: 'Đồng bộ hóa forum posts đã được bắt đầu.' };
  }

  @Post('sync/documents')
  @Roles(UserRole.ADMIN)
  async syncDocuments() {
    await this.elasticsearchService.syncDocuments();
    return { message: 'Đồng bộ hóa documents đã được bắt đầu.' };
  }

  @Post('sync/tasks')
  @Roles(UserRole.ADMIN)
  async syncTasks() {
    await this.elasticsearchService.syncTasks();
    return { message: 'Đồng bộ hóa tasks đã được bắt đầu.' };
  }

  @Post('sync/notifications')
  @Roles(UserRole.ADMIN)
  async syncNotifications() {
    await this.elasticsearchService.syncNotifications();
    return { message: 'Đồng bộ hóa notifications đã được bắt đầu.' };
  }

  @Post('sync/users')
  @Roles(UserRole.ADMIN)
  async syncUsers() {
    await this.elasticsearchService.syncUsers();
    return { message: 'Đồng bộ hóa users đã được bắt đầu.' };
  }
}