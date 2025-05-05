// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Document } from '../entities/document.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { Task } from '../entities/task.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private isElasticsearchAvailable = false;

  constructor(
    private readonly esService: NestElasticsearchService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Kiểm tra kết nối Elasticsearch
    try {
      const health = await this.esService.cluster.health();
      this.isElasticsearchAvailable = health.status !== 'red';
      this.logger.log(`Elasticsearch connection status: ${health.status}`);
      
      // Khởi tạo indices nếu chưa tồn tại
      await this.setupIndices();
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.error(`Failed to connect to Elasticsearch: ${error.message}`);
    }
  }

  private async setupIndices() {
    if (!this.isElasticsearchAvailable) return;

    try {
      // Tạo các indices nếu chưa tồn tại
      const indices = ['users', 'documents', 'forum_posts', 'tasks', 'notifications'];
      
      for (const index of indices) {
        const exists = await this.esService.indices.exists({ index });
        
        if (!exists) {
          await this.esService.indices.create({
            index,
            body: {
              settings: {
                number_of_shards: 1,
                number_of_replicas: 0,
                analysis: {
                  analyzer: {
                    vietnamese_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'asciifolding', 'stop']
                    }
                  }
                }
              },
              mappings: {
                properties: this.getIndexMapping(index)
              }
            }
          });
          
          this.logger.log(`Created index: ${index}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error setting up indices: ${error.message}`);
    }
  }

  private getIndexMapping(index: string) {
    const commonFields = {
      created_at: { type: 'date' },
      updated_at: { type: 'date' }
    };
    
    switch (index) {
      case 'users':
        return {
          ...commonFields,
          user_id: { type: 'integer' },
          full_name: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          email: { type: 'keyword' },
          phone: { type: 'keyword' },
          department_name: { type: 'keyword' },
          role: { type: 'keyword' }
        };
      case 'documents':
        return {
          ...commonFields,
          document_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          category: { type: 'keyword' },
          content: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer'
          },
          uploaded_by: { type: 'integer' },
          uploader_name: { type: 'keyword' }
        };
      case 'forum_posts':
        return {
          ...commonFields,
          post_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          content: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer'
          },
          user_id: { type: 'integer' },
          author_name: { type: 'keyword' },
          comment_count: { type: 'integer' }
        };
      case 'tasks':
        return {
          ...commonFields,
          task_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          description: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer'
          },
          assigned_to: { type: 'integer' },
          assigned_by: { type: 'integer' },
          assignee_name: { type: 'keyword' },
          assigner_name: { type: 'keyword' },
          status: { type: 'keyword' },
          deadline: { type: 'date' }
        };
      case 'notifications':
        return {
          ...commonFields,
          notification_id: { type: 'integer' },
          user_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          content: { 
            type: 'text',
            analyzer: 'vietnamese_analyzer'
          },
          type: { type: 'keyword' },
          is_read: { type: 'boolean' }
        };
      default:
        return commonFields;
    }
  }
  
  // Phương thức kiểm tra Elasticsearch có sẵn sàng không
  checkHealth() {
    return {
      available: this.isElasticsearchAvailable,
      timestamp: new Date().toISOString()
    };
  }

  // Phương thức tìm kiếm chung
  async search(index: string, query: any) {
    if (!this.isElasticsearchAvailable) {
      return { hits: { total: { value: 0 }, hits: [] } };
    }

    try {
      return await this.esService.search({
        index,
        body: query
      });
    } catch (error) {
      this.logger.error(`Search error in index ${index}: ${error.message}`);
      return { hits: { total: { value: 0 }, hits: [] } };
    }
  }

  // Phương thức tìm kiếm người dùng
  async searchUsers(term: string, size: number = 10) {
    if (!this.isElasticsearchAvailable) {
      return { results: [], total: 0 };
    }

    try {
      const query = {
        query: {
          multi_match: {
            query: term,
            fields: ['full_name^3', 'email^2', 'phone', 'department_name']
          }
        },
        size
      };

      const response = await this.esService.search({
        index: 'users',
        body: query
      });

      const results = response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }));

      return {
        results,
        total: response.hits.total.value
      };
    } catch (error) {
      this.logger.error(`User search error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức tìm kiếm tài liệu
  async searchDocuments(term: string, category?: string, size: number = 10) {
    if (!this.isElasticsearchAvailable) {
      return { results: [], total: 0 };
    }

    try {
      let query: any = {
        bool: {
          must: [
            {
              multi_match: {
                query: term,
                fields: ['title^3', 'content^2', 'category', 'uploader_name']
              }
            }
          ]
        }
      };

      if (category) {
        query.bool.filter = [
          { term: { category } }
        ];
      }

      const response = await this.esService.search({
        index: 'documents',
        body: {
          query,
          size
        }
      });

      const results = response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }));

      return {
        results,
        total: response.hits.total.value
      };
    } catch (error) {
      this.logger.error(`Document search error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức tìm kiếm bài viết diễn đàn
  async searchForumPosts(term: string, size: number = 10) {
    if (!this.isElasticsearchAvailable) {
      return { results: [], total: 0 };
    }

    try {
      const query = {
        query: {
          multi_match: {
            query: term,
            fields: ['title^3', 'content^2', 'author_name']
          }
        },
        size
      };

      const response = await this.esService.search({
        index: 'forum_posts',
        body: query
      });

      const results = response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }));

      return {
        results,
        total: response.hits.total.value
      };
    } catch (error) {
      this.logger.error(`Forum post search error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức tìm kiếm nhiệm vụ
  async searchTasks(term: string, status?: string, size: number = 10) {
    if (!this.isElasticsearchAvailable) {
      return { results: [], total: 0 };
    }

    try {
      let query: any = {
        bool: {
          must: [
            {
              multi_match: {
                query: term,
                fields: ['title^3', 'description^2', 'assignee_name', 'assigner_name']
              }
            }
          ]
        }
      };

      if (status) {
        query.bool.filter = [
          { term: { status } }
        ];
      }

      const response = await this.esService.search({
        index: 'tasks',
        body: {
          query,
          size
        }
      });

      const results = response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }));

      return {
        results,
        total: response.hits.total.value
      };
    } catch (error) {
      this.logger.error(`Task search error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức tìm kiếm thông báo
  async searchNotifications(term: string, userId: number, size: number = 10) {
    if (!this.isElasticsearchAvailable) {
      return { results: [], total: 0 };
    }

    try {
      const query = {
        bool: {
          must: [
            {
              multi_match: {
                query: term,
                fields: ['title^3', 'content^2']
              }
            },
            {
              term: { user_id: userId }
            }
          ]
        }
      };

      const response = await this.esService.search({
        index: 'notifications',
        body: {
          query,
          size,
          sort: [
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const results = response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }));

      return {
        results,
        total: response.hits.total.value
      };
    } catch (error) {
      this.logger.error(`Notification search error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức lấy thống kê tài liệu
  async getDocumentStatistics() {
    if (!this.isElasticsearchAvailable) {
      return {
        total: 0,
        byCategory: [],
        recentUploads: []
      };
    }

    try {
      const [totalResponse, categoryAggs, recentDocs] = await Promise.all([
        // Tổng số tài liệu
        this.esService.count({ index: 'documents' }),
        
        // Thống kê theo category
        this.esService.search({
          index: 'documents',
          body: {
            size: 0,
            aggs: {
              categories: {
                terms: {
                  field: 'category.keyword',
                  size: 10
                }
              }
            }
          }
        }),
        
        // Tài liệu mới nhất
        this.esService.search({
          index: 'documents',
          body: {
            query: { match_all: {} },
            size: 5,
            sort: [
              { created_at: { order: 'desc' } }
            ]
          }
        })
      ]);

      return {
        total: totalResponse.count,
        byCategory: categoryAggs.aggregations.categories.buckets.map(bucket => ({
          category: bucket.key,
          count: bucket.doc_count
        })),
        recentUploads: recentDocs.hits.hits.map(hit => hit._source)
      };
    } catch (error) {
      this.logger.error(`Document statistics error: ${error.message}`);
      return {
        total: 0,
        byCategory: [],
        recentUploads: []
      };
    }
  }

  // Phương thức để index dữ liệu người dùng
  async indexUser(user: User) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.index({
        index: 'users',
        id: user.user_id.toString(),
        body: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          department_name: user.department?.department_name || '',
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      });
    } catch (error) {
      this.logger.error(`Error indexing user: ${error.message}`);
    }
  }

  // Phương thức để index dữ liệu tài liệu
  async indexDocument(document: Document) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.index({
        index: 'documents',
        id: document.document_id.toString(),
        body: {
          document_id: document.document_id,
          title: document.title,
          category: document.category,
          uploaded_by: document.uploaded_by,
          uploader_name: document.uploader?.full_name || '',
          created_at: document.uploaded_at,
          updated_at: document.uploaded_at,
          // Thêm trường content nếu có
          content: '' // Cần trích xuất nội dung file nếu có thể
        }
      });
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`);
    }
  }

  // Phương thức để index dữ liệu bài viết diễn đàn
  async indexForumPost(post: ForumPost, commentCount: number) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.index({
        index: 'forum_posts',
        id: post.post_id.toString(),
        body: {
          post_id: post.post_id,
          title: post.title,
          content: post.content,
          user_id: post.user_id,
          author_name: post.user?.full_name || '',
          comment_count: commentCount,
          created_at: post.created_at,
          updated_at: post.updated_at
        }
      });
    } catch (error) {
      this.logger.error(`Error indexing forum post: ${error.message}`);
    }
  }

  // Phương thức để index dữ liệu nhiệm vụ
  async indexTask(task: Task) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.index({
        index: 'tasks',
        id: task.task_id.toString(),
        body: {
          task_id: task.task_id,
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assigned_by: task.assigned_by,
          assignee_name: task.assignedToUser?.full_name || '',
          assigner_name: task.assignedByUser?.full_name || '',
          status: task.status,
          deadline: task.deadline,
          created_at: task.created_at,
          updated_at: task.updated_at
        }
      });
    } catch (error) {
      this.logger.error(`Error indexing task: ${error.message}`);
    }
  }

  // Phương thức để index dữ liệu thông báo
  async indexNotification(notification: Notification) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.index({
        index: 'notifications',
        id: notification.notification_id.toString(),
        body: {
          notification_id: notification.notification_id,
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at
        }
      });
    } catch (error) {
      this.logger.error(`Error indexing notification: ${error.message}`);
    }
  }

  // Phương thức để cập nhật thông báo
  async updateNotification(notification: Notification) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.update({
        index: 'notifications',
        id: notification.notification_id.toString(),
        body: {
          doc: {
            is_read: notification.is_read,
            updated_at: new Date()
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error updating notification: ${error.message}`);
    }
  }

  // Phương thức để xóa thông báo
  async deleteNotification(notificationId: number) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await this.esService.delete({
        index: 'notifications',
        id: notificationId.toString()
      });
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
    }
  }

  // Thêm phương thức đồng bộ dữ liệu
  async syncForumPosts(forumPosts: ForumPost[], commentCounts: Record<number, number>) {
    if (!this.isElasticsearchAvailable) return { success: false, message: 'Elasticsearch not available' };
    
    try {
      const operations = [];
      
      for (const post of forumPosts) {
        operations.push({
          index: {
            _index: 'forum_posts',
            _id: post.post_id.toString()
          }
        });
        
        operations.push({
          post_id: post.post_id,
          title: post.title,
          content: post.content,
          user_id: post.user_id,
          author_name: post.user?.full_name || '',
          comment_count: commentCounts[post.post_id] || 0,
          created_at: post.created_at,
          updated_at: post.updated_at
        });
      }
      
      if (operations.length > 0) {
        await this.esService.bulk({ body: operations });
      }
      
      return { 
        success: true, 
        message: `Synced ${forumPosts.length} forum posts`
      };
    } catch (error) {
      this.logger.error(`Error syncing forum posts: ${error.message}`);
      return { 
        success: false, 
        message: `Error syncing forum posts: ${error.message}`
      };
    }
  }

  async syncDocuments(documents: Document[]) {
    if (!this.isElasticsearchAvailable) return { success: false, message: 'Elasticsearch not available' };
    
    try {
      const operations = [];
      
      for (const doc of documents) {
        operations.push({
          index: {
            _index: 'documents',
            _id: doc.document_id.toString()
          }
        });
        
        operations.push({
          document_id: doc.document_id,
          title: doc.title,
          category: doc.category,
          uploaded_by: doc.uploaded_by,
          uploader_name: doc.uploader?.full_name || '',
          created_at: doc.uploaded_at,
          updated_at: doc.uploaded_at,
          content: '' // Cần trích xuất nội dung file nếu có thể
        });
      }
      
      if (operations.length > 0) {
        await this.esService.bulk({ body: operations });
      }
      
      return { 
        success: true, 
        message: `Synced ${documents.length} documents`
      };
    } catch (error) {
      this.logger.error(`Error syncing documents: ${error.message}`);
      return { 
        success: false, 
        message: `Error syncing documents: ${error.message}`
      };
    }
  }

  async syncTasks(tasks: Task[]) {
    if (!this.isElasticsearchAvailable) return { success: false, message: 'Elasticsearch not available' };
    
    try {
      const operations = [];
      
      for (const task of tasks) {
        operations.push({
          index: {
            _index: 'tasks',
            _id: task.task_id.toString()
          }
        });
        
        operations.push({
          task_id: task.task_id,
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assigned_by: task.assigned_by,
          assignee_name: task.assignedToUser?.full_name || '',
          assigner_name: task.assignedByUser?.full_name || '',
          status: task.status,
          deadline: task.deadline,
          created_at: task.created_at,
          updated_at: task.updated_at
        });
      }
      
      if (operations.length > 0) {
        await this.esService.bulk({ body: operations });
      }
      
      return { 
        success: true, 
        message: `Synced ${tasks.length} tasks`
      };
    } catch (error) {
      this.logger.error(`Error syncing tasks: ${error.message}`);
      return { 
        success: false, 
        message: `Error syncing tasks: ${error.message}`
      };
    }
  }

  async syncNotifications(notifications: Notification[]) {
    if (!this.isElasticsearchAvailable) return { success: false, message: 'Elasticsearch not available' };
    
    try {
      const operations = [];
      
      for (const notification of notifications) {
        operations.push({
          index: {
            _index: 'notifications',
            _id: notification.notification_id.toString()
          }
        });
        
        operations.push({
          notification_id: notification.notification_id,
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at
        });
      }
      
      if (operations.length > 0) {
        await this.esService.bulk({ body: operations });
      }
      
      return { 
        success: true, 
        message: `Synced ${notifications.length} notifications`
      };
    } catch (error) {
      this.logger.error(`Error syncing notifications: ${error.message}`);
      return { 
        success: false, 
        message: `Error syncing notifications: ${error.message}`
      };
    }
  }

  async syncUsers(users: User[]) {
    if (!this.isElasticsearchAvailable) return { success: false, message: 'Elasticsearch not available' };
    
    try {
      const operations = [];
      
      for (const user of users) {
        operations.push({
          index: {
            _index: 'users',
            _id: user.user_id.toString()
          }
        });
        
        operations.push({
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          department_name: user.department?.department_name || '',
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at
        });
      }
      
      if (operations.length > 0) {
        await this.esService.bulk({ body: operations });
      }
      
      return { 
        success: true, 
        message: `Synced ${users.length} users`
      };
    } catch (error) {
      this.logger.error(`Error syncing users: ${error.message}`);
      return { 
        success: false, 
        message: `Error syncing users: ${error.message}`
      };
    }
  }
}