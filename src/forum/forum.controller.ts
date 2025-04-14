// src/forum/forum.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('forum')
@UseGuards(JwtAuthGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('posts')
  findAllPosts() {
    return this.forumService.findAllPosts();
  }

  @Get('posts/:id')
  findPost(@Param('id') id: string) {
    return this.forumService.findPost(+id);
  }

  @Post('posts')
  createPost(@Body() createPostDto: CreatePostDto, @Request() req) {
    // Use current user if userId not provided
    if (!createPostDto.userId) {
      createPostDto.userId = req.user.userId;
    }
    
    return this.forumService.createPost(createPostDto);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.forumService.updatePost(+id, updatePostDto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.forumService.deletePost(+id);
  }

  @Get('posts/:id/comments')
  findCommentsByPost(@Param('id') id: string) {
    return this.forumService.findCommentsByPost(+id);
  }

  @Post('comments')
  createComment(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    // Use current user if userId not provided
    if (!createCommentDto.userId) {
      createCommentDto.userId = req.user.userId;
    }
    
    return this.forumService.createComment(createCommentDto);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string) {
    return this.forumService.deleteComment(+id);
  }
}