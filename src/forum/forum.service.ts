// src/forum/forum.service.ts
import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ForumService.name);

  constructor(
    @InjectRepository(ForumPost)
    private postsRepository: Repository<ForumPost>,
    
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
    
    private commentCounterService: CommentCounterService,
  ) {}
  
  async onModuleInit() {
    // Khởi tạo comment counters khi service được khởi tạo
    try {
      await this.initializeCommentCounters();
    } catch (error) {
      this.logger.error(`Failed to initialize comment counters: ${error.message}`);
    }
  }
  
  private async initializeCommentCounters(): Promise<void> {
    try {
      // Kiểm tra bảng forum_posts có tồn tại không
      const checkTableExists = async () => {
        try {
          // Thử đếm số lượng bản ghi để kiểm tra bảng có tồn tại không
          await this.postsRepository.count();
          return true;
        } catch (error) {
          if (error.message && (error.message.includes('relation "forum_posts" does not exist') || 
              error.message.includes('relation "ForumPosts" does not exist'))) {
            this.logger.warn('The forum_posts table does not exist yet. Skipping counter initialization.');
            return false;
          }
          this.logger.error(`Error checking forum_posts table: ${error.message}`);
          throw error; // Re-throw nếu là lỗi khác
        }
      };

      const tableExists = await checkTableExists();
      if (!tableExists) {
        return;
      }

      // Lấy tất cả post IDs
      const posts = await this.postsRepository.find({ select: ['post_id'] });
      const postIds = posts.map(post => post.post_id);
      
      this.logger.log(`Initializing comment counters for ${postIds.length} forum posts`);
      
      // Khởi tạo counters
      await this.commentCounterService.initializeCounters(postIds);
      
      this.logger.log('Comment counters initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize comment counters: ${error.message}`);
    }
  }

  async findAllPosts(): Promise<ForumPost[]> {
    try {
      const posts = await this.postsRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
      
      // Thêm comment counts từ Redis
      for (const post of posts) {
        post['commentCount'] = await this.commentCounterService.getCount(post.post_id);
      }
      
      return posts;
    } catch (error) {
      this.logger.error(`Error fetching posts: ${error.message}`);
      return [];
    }
  }

  async findPost(id: number): Promise<ForumPost> {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching post ${id}: ${error.message}`);
      throw new NotFoundException(`Error fetching post ${id}`);
    }
  }

  async createPost(createPostDto: CreatePostDto): Promise<ForumPost> {
    try {
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
    } catch (error) {
      this.logger.error(`Error creating post: ${error.message}`);
      throw error;
    }
  }

  async updatePost(id: number, updatePostDto: UpdatePostDto): Promise<ForumPost> {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating post ${id}: ${error.message}`);
      throw error;
    }
  }

  async deletePost(id: number): Promise<void> {
    try {
      const post = await this.findPost(id);
      
      // Delete all comments for this post
      await this.commentsRepository.delete({ post_id: id });
      
      // Delete post
      await this.postsRepository.remove(post);
      
      // Xóa comment counter
      await this.commentCounterService.removeCount(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting post ${id}: ${error.message}`);
      throw error;
    }
  }

  async findCommentsByPost(postId: number): Promise<ForumComment[]> {
    try {
      return this.commentsRepository.find({
        where: { post_id: postId },
        relations: ['user'],
        order: { created_at: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching comments for post ${postId}: ${error.message}`);
      return [];
    }
  }

  async createComment(createCommentDto: CreateCommentDto): Promise<ForumComment> {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error creating comment: ${error.message}`);
      throw error;
    }
  }

  async deleteComment(id: number): Promise<void> {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting comment ${id}: ${error.message}`);
      throw error;
    }
  }
  
  // Sửa lỗi trong phương thức này
  async searchPosts(keyword: string): Promise<ForumPost[]> {
    try {
      const posts = await this.postsRepository.createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.title ILIKE :keyword OR post.content ILIKE :keyword', { keyword: `%${keyword}%` })
        .orderBy('post.created_at', 'DESC')
        .getMany();
      
      // Thêm comment counts từ Redis
      const enhancedPosts = [];
      for (const post of posts) {
        if (post) {  // Kiểm tra null/undefined
          post['commentCount'] = await this.commentCounterService.getCount(post.post_id);
          enhancedPosts.push(post);
        }
      }
      
      return enhancedPosts;
    } catch (error) {
      this.logger.error(`Error searching posts: ${error.message}`);
      return [];
    }
  }
  
  // Sửa lỗi trong phương thức này
  async getPopularPosts(limit: number = 5): Promise<ForumPost[]> {
    try {
      // Lấy tất cả posts
      const allPosts = await this.postsRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
      
      // Lấy comment counts cho mỗi post
      const postsWithComments: (ForumPost & { commentCount: number })[] = [];
      
      for (const post of allPosts) {
        if (post) {  // Kiểm tra null/undefined
          const commentCount = await this.commentCounterService.getCount(post.post_id);
          postsWithComments.push({
            ...post,
            commentCount
          } as ForumPost & { commentCount: number });
        }
      }
      
      // Sắp xếp theo số lượng comment giảm dần
      postsWithComments.sort((a, b) => b.commentCount - a.commentCount);
      
      // Trả về limit post phổ biến nhất
      return postsWithComments.slice(0, limit) as ForumPost[];
    } catch (error) {
      this.logger.error(`Error fetching popular posts: ${error.message}`);
      return [];
    }
  }

  async searchComments(postId: number, keyword: string): Promise<ForumComment[]> {
    try {
      const comments = await this.commentsRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .where('comment.post_id = :postId', { postId })
        .andWhere('comment.content ILIKE :keyword', { keyword: `%${keyword}%` })
        .orderBy('comment.created_at', 'ASC')
        .getMany();
      
      return comments;
    } catch (error) {
      this.logger.error(`Error searching comments for post ${postId}: ${error.message}`);
      return [];
    }
  }
}