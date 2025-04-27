// src/course-reviews/course-reviews.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CourseReviewsService } from './course-reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('course-reviews')
@UseGuards(JwtAuthGuard)
export class CourseReviewsController {
  constructor(private readonly courseReviewsService: CourseReviewsService) {}

  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.courseReviewsService.findByCourse(+courseId);
  }

  @Post()
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.courseReviewsService.create(createReviewDto, req.user.userId);
  }
}