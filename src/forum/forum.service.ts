// src/forum/forum.service.ts
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentCounterService } from './services/comment-counter.service';

@Injectable()
export class ForumService implements OnModuleInit {
  constructor(
    @InjectRepository(ForumPost)
    private postsRepository: Repository<ForumPost>,
    
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
    
    private commentCounterService: CommentCounterService,
  ) {}
  
  async onModuleInit() {
    // Khởi tạo comment counters khi service được khởi tạo
    await this.initializeCommentCounters();
  }
  
  private async initializeCommentCounters(): Promise<void> {
    try {
      // Lấy tất cả post IDs
      const posts = await this.postsRepository.find({ select: ['post_id'] });
      const postIds = posts.map(post => post.post_id);
      
      // Khởi tạo counters
      await this.commentCounterService.initializeCounters(postIds);
    } catch (error) {
      console.error('Failed to initialize comment counters:', error);
    }
  }

  async findAllPosts(): Promise<ForumPost[]> {
    const posts = await this.postsRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
    
    // Thêm comment counts từ Redis
    for (const post of posts) {
      post['commentCount'] = await this.commentCounterService.getCount(post.post_id);
    }
    
    return posts;
  }

  async findPost(id: number): Promise<ForumPost> {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
      relations: ['user'],
    });
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    // Thêm comment count từ Redis
    post['commentCount'] = await this.commentCounterService.getCount(post.post_id);
    
    return post;
  }

  async createPost(createPostDto: CreatePostDto): Promise<ForumPost> {
    const post = this.postsRepository.create({
      title: createPostDto.title,
      content: createPostDto.content,
      user_id: createPostDto.userId,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    const savedPost = await this.postsRepository.save(post);
    
    // Khởi tạo comment counter cho bài viết mới
    await this.commentCounterService.setCount(savedPost.post_id, 0);
    
    // Thêm commentCount vào kết quả
    savedPost['commentCount'] = 0;
    
    return savedPost;
  }

  async updatePost(id: number, updatePostDto: UpdatePostDto): Promise<ForumPost> {
    const post = await this.findPost(id);
    
    // Update post
    const updatedPost = {
      ...post,
      title: updatePostDto.title || post.title,
      content: updatePostDto.content || post.content,
      updated_at: new Date(),
    };
    
    const savedPost = await this.postsRepository.save(updatedPost);
    
    // Thêm commentCount vào kết quả
    savedPost['commentCount'] = await this.commentCounterService.getCount(id);
    
    return savedPost;
  }

  async deletePost(id: number): Promise<void> {
    const post = await this.findPost(id);
    
    // Delete all comments for this post
    await this.commentsRepository.delete({ post_id: id });
    
    // Delete post
    await this.postsRepository.remove(post);
    
    // Xóa comment counter
    await this.commentCounterService.removeCount(id);
  }

  async findCommentsByPost(postId: number): Promise<ForumComment[]> {
    return this.commentsRepository.find({
      where: { post_id: postId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async createComment(createCommentDto: CreateCommentDto): Promise<ForumComment> {
    // Check if post exists
    await this.findPost(createCommentDto.postId);
    
    const comment = this.commentsRepository.create({
      content: createCommentDto.content,
      post_id: createCommentDto.postId,
      user_id: createCommentDto.userId,
      created_at: new Date(),
    });
    
    const savedComment = await this.commentsRepository.save(comment);
    
    // Tăng counter
    const commentCount = await this.commentCounterService.increment(createCommentDto.postId);
    
    // Thêm commentCount vào kết quả
    savedComment['totalComments'] = commentCount;
    
    return savedComment;
  }

  async deleteComment(id: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { comment_id: id },
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    const postId = comment.post_id;
    
    await this.commentsRepository.remove(comment);
    
    // Giảm counter
    await this.commentCounterService.decrement(postId);
  }
}