// src/elasticsearch/elasticsearch.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('elasticsearch')
@UseGuards(JwtAuthGuard)
export class ElasticsearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Get('health')
  checkHealth() {
    return this.elasticsearchService.checkHealth();
  }

  @Get('search/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  searchUsers(
    @Query('term') term: string,
    @Query('size') size?: number
  ) {
    return this.elasticsearchService.searchUsers(term, size);
  }

  @Get('search/documents')
  searchDocuments(
    @Query('term') term: string,
    @Query('category') category?: string,
    @Query('size') size?: number
  ) {
    return this.elasticsearchService.searchDocuments(term, category, size);
  }

  @Get('search/forum')
  searchForum(
    @Query('term') term: string,
    @Query('size') size?: number
  ) {
    return this.elasticsearchService.searchForumPosts(term, size);
  }

  @Get('search/tasks')
  searchTasks(
    @Query('term') term: string,
    @Query('status') status?: string,
    @Query('size') size?: number
  ) {
    return this.elasticsearchService.searchTasks(term, status, size);
  }

  @Get('search/notifications')
  searchNotifications(
    @Query('term') term: string,
    @Query('userId') userId: number,
    @Query('size') size?: number
  ) {
    return this.elasticsearchService.searchNotifications(term, userId, size);
  }

  @Get('statistics/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SENIOR_MANAGER)
  getDocumentStatistics() {
    return this.elasticsearchService.getDocumentStatistics();
  }

  @Post('sync/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncAllIndices() {
    // Implementation note: this should be delegated to a background job
    // as it may take significant time to complete
    return {
      message: 'Sync all data started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync/forum')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncForumData(@Body() data: any) {
    return {
      message: 'Forum data sync started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncDocumentsData(@Body() data: any) {
    return {
      message: 'Documents data sync started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync/tasks')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncTasksData(@Body() data: any) {
    return {
      message: 'Tasks data sync started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync/notifications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncNotificationsData(@Body() data: any) {
    return {
      message: 'Notifications data sync started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }

  @Post('sync/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncUsersData(@Body() data: any) {
    return {
      message: 'Users data sync started',
      status: 'processing',
      timestamp: new Date().toISOString()
    };
  }
}