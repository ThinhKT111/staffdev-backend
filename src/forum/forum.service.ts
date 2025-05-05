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
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Injectable()
export class ForumService implements OnModuleInit {
  private readonly logger = new Logger(ForumService.name);

  constructor(
    @InjectRepository(ForumPost)
    private postsRepository: Repository<ForumPost>,
    
    @InjectRepository(ForumComment)
    private commentsRepository: Repository<ForumComment>,
    
    private commentCounterService: CommentCounterService,
    
    private elasticsearchService: ElasticsearchService
  ) {}
  
  async onModuleInit() {
    // Initialize comment counters when service is initialized
    try {
      await this.initializeCommentCounters();
    } catch (error) {
      this.logger.error(`Failed to initialize comment counters: ${error.message}`);
    }
  }
  
  private async initializeCommentCounters(): Promise<void> {
    try {
      // Check if forum_posts table exists
      const checkTableExists = async () => {
        try {
          // Try counting records to check if table exists
          await this.postsRepository.count();
          return true;
        } catch (error) {
          if (error.message && (error.message.includes('relation "forum_posts" does not exist') || 
              error.message.includes('relation "forumposts" does not exist'))) {
            this.logger.warn('The forum_posts table does not exist yet. Skipping counter initialization.');
            return false;
          }
          this.logger.error(`Error checking forum_posts table: ${error.message}`);
          throw error; // Re-throw if it's a different error
        }
      };

      const tableExists = await checkTableExists();
      if (!tableExists) {
        return;
      }

      // Get all post IDs
      const posts = await this.postsRepository.find({ select: ['post_id'] });
      const postIds = posts.map(post => post.post_id);
      
      this.logger.log(`Initializing comment counters for ${postIds.length} forum posts`);
      
      // Initialize counters
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
      
      // Add comment counts from Redis
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
      
      // Add comment count from Redis
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
      
      // Initialize comment counter for new post
      await this.commentCounterService.setCount(savedPost.post_id, 0);
      
      // Add commentCount to result
      savedPost['commentCount'] = 0;
      
      // Index in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.indexForumPost(savedPost);
        } catch (error) {
          this.logger.error(`Error indexing post in Elasticsearch: ${error.message}`);
        }
      }
      
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
      
      // Add commentCount to result
      savedPost['commentCount'] = await this.commentCounterService.getCount(id);
      
      // Update in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.indexForumPost(savedPost);
        } catch (error) {
          this.logger.error(`Error updating post in Elasticsearch: ${error.message}`);
        }
      }
      
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
      
      // Delete comment counter
      await this.commentCounterService.removeCount(id);
      
      // Remove from Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.removeForumPostFromIndex(id);
        } catch (error) {
          this.logger.error(`Error removing post from Elasticsearch: ${error.message}`);
        }
      }
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
      
      // Increment counter
      const commentCount = await this.commentCounterService.increment(createCommentDto.postId);
      
      // Add totalComments to result
      savedComment['totalComments'] = commentCount;
      
      // Index in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.indexForumComment(savedComment);
        } catch (error) {
          this.logger.error(`Error indexing comment in Elasticsearch: ${error.message}`);
        }
      }
      
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
      
      // Decrement counter
      await this.commentCounterService.decrement(postId);
      
      // Remove from Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.removeForumCommentFromIndex(id);
        } catch (error) {
          this.logger.error(`Error removing comment from Elasticsearch: ${error.message}`);
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting comment ${id}: ${error.message}`);
      throw error;
    }
  }
  
  async searchPosts(query: string): Promise<ForumPost[]> {
    try {
      // Use Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          const searchResults = await this.elasticsearchService.searchForumPosts(query);
          
          if (searchResults.hits.length > 0) {
            // Get post IDs from search results
            const postIds = searchResults.hits.map(hit => hit.post_id);
            
            // Fetch complete post records from database
            const posts = await this.postsRepository.find({
              where: { post_id: In(postIds) },
              relations: ['user'],
            });
            
            // Sort posts based on Elasticsearch score order
            const sortedPosts = postIds.map(id => {
              const post = posts.find(p => p.post_id === id);
              if (post) {
                // Add comment count to each post
                this.commentCounterService.getCount(post.post_id)
                  .then(count => post['commentCount'] = count)
                  .catch(err => this.logger.error(`Error getting comment count: ${err.message}`));
                
                return post;
              }
              return null;
            }).filter(p => p !== null) as ForumPost[];
            
            return sortedPosts;
          }
        } catch (error) {
          this.logger.error(`Elasticsearch search failed, falling back to database: ${error.message}`);
        }
      }
      
      // Fallback to database search
      const posts = await this.postsRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.title ILIKE :query OR post.content ILIKE :query', { query: `%${query}%` })
        .orderBy('post.created_at', 'DESC')
        .getMany();
      
      // Add comment counts
      for (const post of posts) {
        post['commentCount'] = await this.commentCounterService.getCount(post.post_id);
      }
      
      return posts;
    } catch (error) {
      this.logger.error(`Error searching posts: ${error.message}`);
      return [];
    }
  }
}