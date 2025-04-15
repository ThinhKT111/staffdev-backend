// src/forum/forum.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForumPost, ForumComment])],
  providers: [ForumService],
  controllers: [ForumController]
})
export class ForumModule {}