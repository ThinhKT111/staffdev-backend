// src/elasticsearch/elasticsearch.controller.ts
import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ElasticsearchService } from './elasticsearch.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class ElasticsearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Get('health')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkHealth() {
    const isHealthy = await this.elasticsearchService.checkHealth();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
    };
  }

  @Get('tasks')
  async searchTasks(
    @Query('query') query: string,
    @Query('status') status: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const statusList = status ? status.split(',') : undefined;
    return this.elasticsearchService.searchTasks(
      query,
      statusList,
      fromDate,
      toDate,
      page,
      limit,
    );
  }

  @Get('documents')
  async searchDocuments(
    @Query('query') query: string,
    @Query('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.elasticsearchService.searchDocuments(
      query,
      category,
      page,
      limit,
    );
  }

  @Get('notifications')
  async searchNotifications(
    @Query('query') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.elasticsearchService.searchNotifications(
      query,
      page,
      limit,
    );
  }

  @Get('document-stats')
  async getDocumentStatistics() {
    return this.elasticsearchService.getDocumentStatistics();
  }
}