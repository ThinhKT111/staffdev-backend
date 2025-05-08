// src/forum/forum.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';
import { CommentCounterService } from './services/comment-counter.service';
import { AppElasticsearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ForumPost, ForumComment]),
    AppElasticsearchModule,
  ],
  providers: [ForumService, CommentCounterService],
  controllers: [ForumController],
  exports: [ForumService]
})
export class ForumModule {}