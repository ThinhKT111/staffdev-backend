// src/forum/forum.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPost)
    private postsRepository: Repository<ForumPost>,
    
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
  ) {}

  async findAllPosts(): Promise<ForumPost[]> {
    return this.postsRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findPost(id: number): Promise<ForumPost> {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
      relations: ['user'],
    });
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
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
    
    return this.postsRepository.save(post);
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
    
    return this.postsRepository.save(updatedPost);
  }

  async deletePost(id: number): Promise<void> {
    const post = await this.findPost(id);
    
    // Delete all comments for this post
    await this.commentsRepository.delete({ post_id: id });
    
    // Delete post
    await this.postsRepository.remove(post);
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
    
    return this.commentsRepository.save(comment);
  }

  async deleteComment(id: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { comment_id: id },
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    await this.commentsRepository.remove(comment);
  }
}