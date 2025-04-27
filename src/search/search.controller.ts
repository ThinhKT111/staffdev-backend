// src/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('query') query: string,
    @Query('type') type?: string,
    @Query('departmentId') departmentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.searchService.search(
      query,
      type,
      departmentId ? +departmentId : undefined,
      startDate,
      endDate
    );
  }

  @Get('users')
  searchUsers(@Query('query') query: string) {
    return this.searchService.searchUsers(query);
  }

  @Get('courses')
  searchCourses(@Query('query') query: string) {
    return this.searchService.searchCourses(query);
  }

  @Get('documents')
  searchDocuments(@Query('query') query: string, @Query('category') category?: string) {
    return this.searchService.searchDocuments(query, category);
  }

  @Get('forum')
  searchForum(@Query('query') query: string) {
    return this.searchService.searchForum(query);
  }
}