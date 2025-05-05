// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { SearchResponse, SearchTotalHits, IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { Document } from '../entities/document.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumComment } from '../entities/forum-comment.entity';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';

type ElasticsearchIndex = 'forum_posts' | 'forum_comments' | 'documents' | 'tasks' | 'users' | 'system_logs';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;
  private isElasticsearchAvailable = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  async onModuleInit() {
    try {
      await this.checkIndices();
    } catch (error) {
      this.logger.error(`Error initializing indices: ${error.message}`);
    }
  }

  private initializeClient() {
    try {
      const elasticsearchHost = this.configService.get<string>('ELASTICSEARCH_HOST');
      const elasticsearchPort = this.configService.get<number>('ELASTICSEARCH_PORT');

      if (!elasticsearchHost || !elasticsearchPort) {
        this.logger.warn('Elasticsearch configuration missing, some features will be disabled');
        return;
      }

      this.client = new Client({
        node: `http://${elasticsearchHost}:${elasticsearchPort}`
      });

      // Check connection
      this.checkConnection();
    } catch (error) {
      this.logger.error(`Failed to initialize Elasticsearch client: ${error.message}`);
    }
  }

  private async checkConnection() {
    try {
      if (!this.client) {
        this.isElasticsearchAvailable = false;
        return;
      }

      const response = await this.client.ping({ timeout: '3s' });
      this.isElasticsearchAvailable = response !== undefined;
      this.logger.log(`Elasticsearch connection ${this.isElasticsearchAvailable ? 'successful' : 'failed'}`);
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.error(`Elasticsearch connection failed: ${error.message}`);
    }
  }

  // Getter for other services to check if Elasticsearch is available
  public getElasticsearchAvailability(): boolean {
    return this.isElasticsearchAvailable;
  }

  private async checkIndices() {
    if (!this.client || !this.isElasticsearchAvailable) {
      return;
    }

    try {
      // Create indices if they don't exist
      await this.createIndexIfNotExists('forum_posts');
      await this.createIndexIfNotExists('forum_comments');
      await this.createIndexIfNotExists('documents');
      await this.createIndexIfNotExists('tasks');
      await this.createIndexIfNotExists('users');
      await this.createIndexIfNotExists('system_logs');
    } catch (error) {
      this.logger.error(`Error checking indices: ${error.message}`);
      this.isElasticsearchAvailable = false;
    }
  }

  private async createIndexIfNotExists(index: ElasticsearchIndex) {
    try {
      if (!this.client) return;

      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.createIndex(index);
        this.logger.log(`Created index: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Error creating index ${index}: ${error.message}`);
      throw error;
    }
  }

  private async createIndex(index: ElasticsearchIndex) {
    if (!this.client) return;

    try {
      switch (index) {
        case 'forum_posts':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  post_id: { type: 'integer' },
                  user_id: { type: 'integer' },
                  title: { type: 'text', analyzer: 'standard' },
                  content: { type: 'text', analyzer: 'standard' },
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' },
                  comment_count: { type: 'integer' }
                }
              }
            }
          });
          break;
          
        case 'forum_comments':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  comment_id: { type: 'integer' },
                  post_id: { type: 'integer' },
                  user_id: { type: 'integer' },
                  content: { type: 'text', analyzer: 'standard' },
                  created_at: { type: 'date' }
                }
              }
            }
          });
          break;
          
        case 'documents':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  document_id: { type: 'integer' },
                  title: { type: 'text', analyzer: 'standard' },
                  file_url: { type: 'keyword' },
                  category: { type: 'keyword' },
                  uploaded_by: { type: 'integer' },
                  uploaded_at: { type: 'date' },
                  file_content: { type: 'text', analyzer: 'standard' }
                }
              }
            }
          });
          break;
          
        case 'tasks':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  task_id: { type: 'integer' },
                  title: { type: 'text', analyzer: 'standard' },
                  description: { type: 'text', analyzer: 'standard' },
                  assigned_to: { type: 'integer' },
                  assigned_by: { type: 'integer' },
                  deadline: { type: 'date' },
                  status: { type: 'keyword' },
                  score: { type: 'float' },
                  feedback: { type: 'text' },
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' }
                }
              }
            }
          });
          break;
          
        case 'users':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  user_id: { type: 'integer' },
                  cccd: { type: 'keyword' },
                  email: { type: 'keyword' },
                  phone: { type: 'keyword' },
                  full_name: { type: 'text', analyzer: 'standard' },
                  role: { type: 'keyword' },
                  department_id: { type: 'integer' },
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' }
                }
              }
            }
          });
          break;
          
        case 'system_logs':
          await this.client.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  timestamp: { type: 'date' },
                  event_type: { type: 'keyword' },
                  message: { type: 'text' },
                  details: { type: 'object', enabled: false },
                  level: { type: 'keyword' }
                }
              }
            }
          });
          break;
      }
    } catch (error) {
      this.logger.error(`Error creating index ${index}: ${error.message}`);
      throw error;
    }
  }

  // Index a forum post
  async indexForumPost(post: ForumPost): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'forum_posts',
        id: String(post.post_id),
        document: {
          post_id: post.post_id,
          user_id: post.user_id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
          comment_count: post.comments?.length || 0
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing forum post: ${error.message}`);
      return false;
    }
  }

  // Remove a forum post from index
  async removeForumPostFromIndex(postId: number): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.delete({
        index: 'forum_posts',
        id: String(postId),
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing forum post from index: ${error.message}`);
      return false;
    }
  }

  // Search forum posts
  async searchForumPosts(query: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const response = await this.client.search({
        index: 'forum_posts',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title', 'content'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          _source: {
            includes: ['*']
          },
          highlight: {
            fields: {
              title: {},
              content: {}
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ],
          from,
          size
        }
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching forum posts: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Index a forum comment
  async indexForumComment(comment: ForumComment): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'forum_comments',
        id: String(comment.comment_id),
        document: {
          comment_id: comment.comment_id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing forum comment: ${error.message}`);
      return false;
    }
  }

  // Remove a forum comment from index
  async removeForumCommentFromIndex(commentId: number): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.delete({
        index: 'forum_comments',
        id: String(commentId),
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing forum comment from index: ${error.message}`);
      return false;
    }
  }

  // Search forum comments
  async searchForumComments(query: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const response = await this.client.search({
        index: 'forum_comments',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['content'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          _source: {
            includes: ['*']
          },
          highlight: {
            fields: {
              content: {}
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ],
          from,
          size
        }
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching forum comments: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Index a document
  async indexDocument(document: Document, fileContent?: string): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'documents',
        id: String(document.document_id),
        document: {
          document_id: document.document_id,
          title: document.title,
          file_url: document.file_url,
          category: document.category,
          uploaded_by: document.uploaded_by,
          uploaded_at: document.uploaded_at,
          file_content: fileContent || ''
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`);
      return false;
    }
  }

  // Remove a document from index
  async removeDocumentFromIndex(documentId: number): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.delete({
        index: 'documents',
        id: String(documentId),
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing document from index: ${error.message}`);
      return false;
    }
  }

  // Search documents
  async searchDocuments(query: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const response = await this.client.search({
        index: 'documents',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title', 'file_content'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          _source: {
            includes: ['*']
          },
          highlight: {
            fields: {
              title: {},
              file_content: {}
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { uploaded_at: { order: 'desc' } }
          ],
          from,
          size
        }
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Search for forum posts that match a specific user
  async searchForumPostsByUser(query: string, userId: number, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const body: any = {
        query: {
          bool: {
            must: []
          }
        },
        _source: {
          includes: ['*']
        },
        highlight: {
          fields: {
            title: {},
            content: {}
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { created_at: { order: 'desc' } }
        ],
        from,
        size
      };
      
      // Add search query if provided
      if (query) {
        body.query.bool.must.push({
          multi_match: {
            query,
            fields: ['title', 'content'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }
      
      // Add user filter
      body.query.bool.must.push({
        term: { user_id: userId }
      });

      const response = await this.client.search({
        index: 'forum_posts',
        body
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching forum posts by user: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Search for tasks that match query
  async searchTasks(query: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const body: any = {
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: ['title', 'description'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }]
          }
        },
        _source: {
          includes: ['*']
        },
        highlight: {
          fields: {
            title: {},
            description: {}
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { deadline: { order: 'asc' } }
        ],
        from,
        size
      };

      const response = await this.client.search({
        index: 'tasks',
        body
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching tasks: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Search for tasks assigned to specific user
  async searchUserTasks(userId: number, query?: string, status?: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const body: any = {
        query: {
          bool: {
            must: [{ term: { assigned_to: userId } }]
          }
        },
        _source: {
          includes: ['*']
        },
        sort: [
          { _score: { order: 'desc' } }
        ],
        from,
        size
      };

      // Add query if provided
      if (query) {
        body.query.bool.must.push({
          multi_match: {
            query,
            fields: ['title', 'description'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Add status filter if provided
      if (status) {
        body.query.bool.must.push({ term: { status } });
      }

      const response = await this.client.search({
        index: 'tasks',
        body
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching user tasks: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Search for users
  async searchUsers(query: string, from: number = 0, size: number = 10): Promise<{ hits: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { hits: [], total: 0 };
    }

    try {
      const body: any = {
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: ['full_name', 'email', 'phone'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }]
          }
        },
        _source: {
          includes: ['*']
        },
        highlight: {
          fields: {
            full_name: {},
            email: {},
            phone: {}
          }
        },
        sort: [
          { _score: { order: 'desc' } }
        ],
        from,
        size
      };

      const response = await this.client.search({
        index: 'users',
        body
      });

      const hits = response.hits.hits.map(hit => {
        const source = hit._source as any;
        return {
          ...source,
          score: hit._score,
          highlights: hit.highlight
        };
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        hits,
        total
      };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      return { hits: [], total: 0 };
    }
  }

  // Get forum statistics
  async getForumStatistics(days: number = 30): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return {};
    }

    try {
      const body = {
        size: 0,
        query: {
          range: {
            created_at: {
              gte: `now-${days}d/d`
            }
          }
        },
        aggs: {
          posts_per_day: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          },
          comments_per_post: {
            histogram: {
              field: 'comment_count',
              interval: 5
            }
          },
          top_posters: {
            terms: {
              field: 'user_id',
              size: 10
            },
            aggs: {
              post_count: {
                value_count: {
                  field: 'post_id'
                }
              }
            }
          }
        }
      };

      const response = await this.client.search({
        index: 'forum_posts',
        body
      });

      return response.aggregations;
    } catch (error) {
      this.logger.error(`Error getting forum statistics: ${error.message}`);
      return {};
    }
  }

  // Get document statistics
  async getDocumentStatistics(days: number = 30): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return {};
    }

    try {
      const body = {
        size: 0,
        query: {
          range: {
            uploaded_at: {
              gte: `now-${days}d/d`
            }
          }
        },
        aggs: {
          docs_per_day: {
            date_histogram: {
              field: 'uploaded_at',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          },
          docs_per_category: {
            terms: {
              field: 'category',
              size: 10
            }
          },
          top_uploaders: {
            terms: {
              field: 'uploaded_by',
              size: 10
            },
            aggs: {
              doc_count: {
                value_count: {
                  field: 'document_id'
                }
              }
            }
          }
        }
      };

      const response = await this.client.search({
        index: 'documents',
        body
      });

      return response.aggregations;
    } catch (error) {
      this.logger.error(`Error getting document statistics: ${error.message}`);
      return {};
    }
  }

  // Get task statistics
  async getTaskStatistics(days: number = 30): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return {};
    }

    try {
      const body = {
        size: 0,
        query: {
          range: {
            created_at: {
              gte: `now-${days}d/d`
            }
          }
        },
        aggs: {
          tasks_per_day: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          },
          tasks_by_status: {
            terms: {
              field: 'status',
              size: 10
            }
          },
          tasks_by_user: {
            terms: {
              field: 'assigned_to',
              size: 10
            },
            aggs: {
              task_count: {
                value_count: {
                  field: 'task_id'
                }
              }
            }
          },
          tasks_deadline_histogram: {
            date_histogram: {
              field: 'deadline',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          }
        }
      };

      const response = await this.client.search({
        index: 'tasks',
        body
      });

      return response.aggregations;
    } catch (error) {
      this.logger.error(`Error getting task statistics: ${error.message}`);
      return {};
    }
  }
  
  // Index a task
  async indexTask(task: Task): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'tasks',
        id: String(task.task_id),
        document: {
          task_id: task.task_id,
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assigned_by: task.assigned_by,
          deadline: task.deadline,
          status: task.status,
          score: task.score,
          feedback: task.feedback,
          created_at: task.created_at,
          updated_at: task.updated_at
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing task: ${error.message}`);
      return false;
    }
  }

  // Remove a task from index
  async removeTaskFromIndex(taskId: number): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.delete({
        index: 'tasks',
        id: String(taskId),
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing task from index: ${error.message}`);
      return false;
    }
  }
  
  // Get user statistics
  async getUserStatistics(): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return {};
    }

    try {
      const body = {
        size: 0,
        aggs: {
          users_by_role: {
            terms: {
              field: 'role',
              size: 10
            }
          },
          users_by_department: {
            terms: {
              field: 'department_id',
              size: 10
            },
            aggs: {
              department_name: {
                terms: {
                  field: 'department.department_name',
                  size: 10
                }
              }
            }
          }
        }
      };

      const response = await this.client.search({
        index: 'users',
        body
      });

      return response.aggregations;
    } catch (error) {
      this.logger.error(`Error getting user statistics: ${error.message}`);
      return {};
    }
  }

  // Get notification statistics
  async getNotificationStatistics(): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return {};
    }

    try {
      const body = {
        size: 0,
        aggs: {
          notifications_by_type: {
            terms: {
              field: 'type',
              size: 10
            }
          },
          read_vs_unread: {
            terms: {
              field: 'is_read',
              size: 2
            }
          },
          notifications_over_time: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          }
        }
      };

      const response = await this.client.search({
        index: 'notifications',
        body
      });

      return response.aggregations;
    } catch (error) {
      this.logger.error(`Error getting notification statistics: ${error.message}`);
      return {};
    }
  }

  // Index a user
  async indexUser(user: User): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'users',
        id: String(user.user_id),
        document: {
          user_id: user.user_id,
          cccd: user.cccd,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          role: user.role,
          department_id: user.department_id,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing user: ${error.message}`);
      return false;
    }
  }

  // Remove a user from index
  async removeUserFromIndex(userId: number): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.delete({
        index: 'users',
        id: String(userId),
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing user from index: ${error.message}`);
      return false;
    }
  }

  // Log system activity
  async logSystemActivity(eventType: string, message: string, details?: any, level: string = 'info'): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      await this.client.index({
        index: 'system_logs',
        document: {
          timestamp: new Date(),
          event_type: eventType,
          message,
          details: details || {},
          level
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error logging system activity: ${error.message}`);
      return false;
    }
  }

  // Get system logs
  async getSystemLogs(from: number = 0, size: number = 100): Promise<{ logs: any[], total: number }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { logs: [], total: 0 };
    }

    try {
      const body = {
        sort: [
          { timestamp: { order: 'desc' } }
        ],
        from,
        size
      };

      const response = await this.client.search({
        index: 'system_logs',
        body
      });

      const logs = response.hits.hits.map(hit => {
        return hit._source;
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        logs,
        total
      };
    } catch (error) {
      this.logger.error(`Error getting system logs: ${error.message}`);
      return { logs: [], total: 0 };
    }
  }

  // Get search metrics
  async getSearchMetrics(from: Date, to: Date): Promise<any> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { queries: [], total: 0 };
    }

    try {
      const body = {
        query: {
          bool: {
            must: [
              { term: { event_type: 'search' } },
              {
                range: {
                  timestamp: {
                    gte: from.toISOString(),
                    lte: to.toISOString()
                  }
                }
              }
            ]
          }
        },
        sort: [
          { timestamp: { order: 'desc' } }
        ],
        size: 100
      };

      const response = await this.client.search({
        index: 'system_logs',
        body
      });

      const logs = response.hits.hits.map(hit => {
        return hit._source;
      });

      const totalHits = response.hits.total as SearchTotalHits;
      const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value || 0);

      return {
        queries: logs,
        total
      };
    } catch (error) {
      this.logger.error(`Error getting search metrics: ${error.message}`);
      return { queries: [], total: 0 };
    }
  }

  // Bulk index operations
  async bulkIndex(index: ElasticsearchIndex, documents: any[]): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable || documents.length === 0) {
      return false;
    }

    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: index, _id: String(this.getDocumentId(doc, index)) } },
        doc
      ]);

      const { errors } = await this.client.bulk({ refresh: true, operations });
      
      if (errors) {
        this.logger.error(`Errors in bulk indexing: ${JSON.stringify(errors)}`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error in bulk indexing: ${error.message}`);
      return false;
    }
  }

  // Helper to get document ID field based on index
  private getDocumentId(doc: any, index: ElasticsearchIndex): string | number {
    switch (index) {
      case 'forum_posts':
        return doc.post_id;
      case 'forum_comments':
        return doc.comment_id;
      case 'documents':
        return doc.document_id;
      case 'tasks':
        return doc.task_id;
      case 'users':
        return doc.user_id;
      case 'system_logs':
        return doc.log_id || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      default:
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  // Reindex all data from database (for recovery or initial setup)
  async reindexAll(): Promise<{ success: boolean, indices: Record<string, number> }> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return { success: false, indices: {} };
    }

    const result: Record<string, number> = {
      forum_posts: 0,
      forum_comments: 0,
      documents: 0,
      tasks: 0,
      users: 0
    };

    try {
      // Clear and recreate indices
      await Promise.all([
        this.deleteIndex('forum_posts'),
        this.deleteIndex('forum_comments'),
        this.deleteIndex('documents'),
        this.deleteIndex('tasks'),
        this.deleteIndex('users')
      ]);

      await Promise.all([
        this.createIndexIfNotExists('forum_posts'),
        this.createIndexIfNotExists('forum_comments'),
        this.createIndexIfNotExists('documents'),
        this.createIndexIfNotExists('tasks'),
        this.createIndexIfNotExists('users'),
        this.createIndexIfNotExists('system_logs')
      ]);

      this.logger.log('All indices recreated');
      
      // Log activity
      await this.logSystemActivity(
        'reindex', 
        'Started reindexing all data', 
        null, 
        'info'
      );

      return { 
        success: true, 
        indices: result 
      };
    } catch (error) {
      this.logger.error(`Error reindexing all data: ${error.message}`);
      
      // Log activity
      await this.logSystemActivity(
        'reindex_error', 
        `Error reindexing all data: ${error.message}`, 
        { error: error.message }, 
        'error'
      );
      
      return { success: false, indices: result };
    }
  }

  // Delete an index
  private async deleteIndex(index: ElasticsearchIndex): Promise<boolean> {
    if (!this.client || !this.isElasticsearchAvailable) {
      return false;
    }

    try {
      const exists = await this.client.indices.exists({ index });
      
      if (exists) {
        await this.client.indices.delete({ index });
        this.logger.log(`Deleted index: ${index}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting index ${index}: ${error.message}`);
      return false;
    }
  }
}