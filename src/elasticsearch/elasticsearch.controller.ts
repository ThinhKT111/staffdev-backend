// src/elasticsearch/elasticsearch.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { TaskStatus } from '../entities/task.entity';

@Controller('elasticsearch')
@UseGuards(JwtAuthGuard)
export class ElasticsearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Get('health')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  checkHealth() {
    return this.elasticsearchService.checkHealth();
  }

  @Get('search/tasks')
  @UseGuards(JwtAuthGuard)
  async searchTasks(
    @Query('q') query: string = '',
    @Query('status') statusStr?: string,
    @Query('limit') limit: number = 10
  ) {
    // Chuyển đổi status string thành enum TaskStatus nếu có
    let status: TaskStatus | undefined;
    
    if (statusStr) {
      switch (statusStr) {
        case 'Pending':
          status = TaskStatus.PENDING;
          break;
        case 'InProgress':
          status = TaskStatus.IN_PROGRESS;
          break;
        case 'Completed':
          status = TaskStatus.COMPLETED;
          break;
        case 'Rejected':
          status = TaskStatus.REJECTED;
          break;
      }
    }
    
    return this.elasticsearchService.searchTasks(query, status, limit);
  }

  @Get('search/notifications')
  @UseGuards(JwtAuthGuard)
  async searchNotifications(
    @Query('userId') userId: number,
    @Query('q') query: string = '',
    @Query('limit') limit: number = 10
  ) {
    return this.elasticsearchService.searchNotifications(userId, query, limit);
  }

  @Get('statistics/documents')
  @UseGuards(JwtAuthGuard)
  async getDocumentStatistics() {
    return this.elasticsearchService.getDocumentStatistics();
  }
}