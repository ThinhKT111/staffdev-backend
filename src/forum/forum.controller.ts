// src/forum/forum.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
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
      const userId = req.user.userId || req.user.sub;
      const userIdNumber = Number(userId);
      
      if (isNaN(userIdNumber)) {
        throw new Error('User ID không phải là số hợp lệ');
      }
      
      createPostDto.userId = userIdNumber;
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

  @Post('posts/:id/comments')
  createPostComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req
  ) {
    // Ensure postId is set properly
    const postIdNumber = +postId;
    if (isNaN(postIdNumber)) {
      throw new Error('Post ID không phải là số hợp lệ');
    }
    createCommentDto.postId = postIdNumber;
    
    // Ensure userId is set properly
    if (!createCommentDto.userId && req.user) {
      const userId = req.user.userId || req.user.sub;
      if (userId) {
        const userIdNumber = +userId;
        if (isNaN(userIdNumber)) {
          throw new Error('User ID không phải là số hợp lệ');
        }
        createCommentDto.userId = userIdNumber;
      }
    }
    
    // If we still don't have a userId, set it from the current user
    if (!createCommentDto.userId) {
      createCommentDto.userId = 1; // Default to admin as fallback
    }
    
    return this.forumService.createComment(createCommentDto);
  }
  
  @Post('comments')
  createComment(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    // Ensure userId is set properly
    if (!createCommentDto.userId && req.user) {
      const userId = req.user.userId || req.user.sub;
      if (userId) {
        const userIdNumber = +userId;
        if (isNaN(userIdNumber)) {
          throw new Error('User ID không phải là số hợp lệ');
        }
        createCommentDto.userId = userIdNumber;
      }
    }
    
    // If we still don't have a userId, set it from the current user
    if (!createCommentDto.userId) {
      createCommentDto.userId = 1; // Default to admin as fallback
    }
    
    return this.forumService.createComment(createCommentDto);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string) {
    return this.forumService.deleteComment(+id);
  }
}