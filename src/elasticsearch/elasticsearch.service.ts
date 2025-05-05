// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly indices = {
    forumPosts: 'forum_posts',
    forumComments: 'forum_comments',
    documents: 'documents',
    notifications: 'notifications',
    tasks: 'tasks',
    users: 'users',
    courses: 'courses',
    attendance: 'attendance',
  };

  constructor(
    private readonly esService: NestElasticsearchService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Kiểm tra Elasticsearch có khả dụng không
      const isElasticsearchAvailable = await this.isElasticsearchAvailable();
      
      if (!isElasticsearchAvailable) {
        this.logger.warn('Elasticsearch không khả dụng. Các tính năng tìm kiếm nâng cao sẽ bị vô hiệu hóa.');
        return;
      }
      
      this.logger.log('Elasticsearch đã kết nối thành công. Đang thiết lập các indices...');
      
      // Thiết lập các indices
      await this.setupIndices();
      
      this.logger.log('Thiết lập Elasticsearch hoàn tất.');
    } catch (error) {
      this.logger.error(`Lỗi khi khởi tạo Elasticsearch: ${error.message}`);
    }
  }

  private async isElasticsearchAvailable(): Promise<boolean> {
    try {
      const health = await this.esService.cluster.health({});
      return health.status !== 'red';
    } catch (error) {
      this.logger.error(`Không thể kết nối đến Elasticsearch: ${error.message}`);
      return false;
    }
  }

  private async setupIndices() {
    // Thiết lập Forum Posts index
    await this.createIndexIfNotExists(this.indices.forumPosts, {
      mappings: {
        properties: {
          post_id: { type: 'integer' },
          user_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          content: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          user_full_name: { type: 'text' },
          comment_count: { type: 'integer' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });

    // Thiết lập Forum Comments index
    await this.createIndexIfNotExists(this.indices.forumComments, {
      mappings: {
        properties: {
          comment_id: { type: 'integer' },
          post_id: { type: 'integer' },
          user_id: { type: 'integer' },
          content: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          created_at: { type: 'date' },
          user_full_name: { type: 'text' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });

    // Thiết lập Documents index
    await this.createIndexIfNotExists(this.indices.documents, {
      mappings: {
        properties: {
          document_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          category: { type: 'keyword' },
          file_url: { type: 'keyword' },
          uploaded_by: { type: 'integer' },
          uploaded_at: { type: 'date' },
          file_content: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          uploader_name: { type: 'text' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });

    // Thiết lập Notifications index
    await this.createIndexIfNotExists(this.indices.notifications, {
      mappings: {
        properties: {
          notification_id: { type: 'integer' },
          user_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          content: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          type: { type: 'keyword' },
          is_read: { type: 'boolean' },
          created_at: { type: 'date' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });

    // Thiết lập Tasks index
    await this.createIndexIfNotExists(this.indices.tasks, {
      mappings: {
        properties: {
          task_id: { type: 'integer' },
          title: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          description: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          assigned_to: { type: 'integer' },
          assigned_by: { type: 'integer' },
          deadline: { type: 'date' },
          status: { type: 'keyword' },
          score: { type: 'float' },
          feedback: { type: 'text' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          assigned_to_name: { type: 'text' },
          assigned_by_name: { type: 'text' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });

    // Thiết lập Users index
    await this.createIndexIfNotExists(this.indices.users, {
      mappings: {
        properties: {
          user_id: { type: 'integer' },
          full_name: { 
            type: 'text',
            analyzer: 'vietnamese',
            fields: {
              keyword: { type: 'keyword' },
              vietnamese: { type: 'text', analyzer: 'vietnamese' },
            }
          },
          email: { type: 'keyword' },
          phone: { type: 'keyword' },
          role: { type: 'keyword' },
          department_id: { type: 'integer' },
          department_name: { type: 'keyword' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            vietnamese: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    });
  }

  private async createIndexIfNotExists(index: string, body: any) {
    try {
      const indexExists = await this.esService.indices.exists({ index });
      if (!indexExists) {
        await this.esService.indices.create({
          index,
          body,
        });
        this.logger.log(`Index ${index} đã được tạo thành công.`);
      } else {
        this.logger.log(`Index ${index} đã tồn tại.`);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi tạo index ${index}: ${error.message}`);
    }
  }

  // Forum Posts methods
  async indexForumPost(post: any) {
    try {
      return await this.esService.index({
        index: this.indices.forumPosts,
        id: post.post_id.toString(),
        body: post,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index forum post: ${error.message}`);
      return null;
    }
  }

  async updateForumPost(post: any) {
    try {
      return await this.esService.update({
        index: this.indices.forumPosts,
        id: post.post_id.toString(),
        body: {
          doc: post,
        },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi update forum post: ${error.message}`);
      return null;
    }
  }

  async deleteForumPost(postId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.forumPosts,
        id: postId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete forum post: ${error.message}`);
      return null;
    }
  }

  async searchForumPosts(query: string, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      const response = await this.esService.search({
        index: this.indices.forumPosts,
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title', 'title.vietnamese', 'content', 'content.vietnamese', 'user_full_name'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          highlight: {
            fields: {
              title: {},
              content: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search forum posts: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Forum Comments methods
  async indexForumComment(comment: any) {
    try {
      return await this.esService.index({
        index: this.indices.forumComments,
        id: comment.comment_id.toString(),
        body: comment,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index forum comment: ${error.message}`);
      return null;
    }
  }

  async deleteForumComment(commentId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.forumComments,
        id: commentId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete forum comment: ${error.message}`);
      return null;
    }
  }

  async searchForumComments(query: string, postId?: number, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      let queryBody: any = {
        multi_match: {
          query,
          fields: ['content', 'content.vietnamese', 'user_full_name'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      };
      
      if (postId) {
        queryBody = {
          bool: {
            must: [
              queryBody,
              { term: { post_id: postId } },
            ],
          },
        };
      }
      
      const response = await this.esService.search({
        index: this.indices.forumComments,
        body: {
          query: queryBody,
          highlight: {
            fields: {
              content: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search forum comments: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Documents methods
  async indexDocument(document: any) {
    try {
      return await this.esService.index({
        index: this.indices.documents,
        id: document.document_id.toString(),
        body: document,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index document: ${error.message}`);
      return null;
    }
  }

  async updateDocument(document: any) {
    try {
      return await this.esService.update({
        index: this.indices.documents,
        id: document.document_id.toString(),
        body: {
          doc: document,
        },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi update document: ${error.message}`);
      return null;
    }
  }

  async deleteDocument(documentId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.documents,
        id: documentId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete document: ${error.message}`);
      return null;
    }
  }

  async searchDocuments(query: string, category?: string, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      let queryBody: any = {
        multi_match: {
          query,
          fields: ['title', 'title.vietnamese', 'file_content', 'file_content.vietnamese', 'uploader_name'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      };
      
      if (category) {
        queryBody = {
          bool: {
            must: [
              queryBody,
              { term: { category } },
            ],
          },
        };
      }
      
      const response = await this.esService.search({
        index: this.indices.documents,
        body: {
          query: queryBody,
          highlight: {
            fields: {
              title: {},
              file_content: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { uploaded_at: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search documents: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Notifications methods
  async indexNotification(notification: any) {
    try {
      return await this.esService.index({
        index: this.indices.notifications,
        id: notification.notification_id.toString(),
        body: notification,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index notification: ${error.message}`);
      return null;
    }
  }

  async updateNotification(notification: any) {
    try {
      return await this.esService.update({
        index: this.indices.notifications,
        id: notification.notification_id.toString(),
        body: {
          doc: notification,
        },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi update notification: ${error.message}`);
      return null;
    }
  }

  async deleteNotification(notificationId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.notifications,
        id: notificationId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete notification: ${error.message}`);
      return null;
    }
  }

  async searchNotifications(query: string, userId: number, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      const response = await this.esService.search({
        index: this.indices.notifications,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['title', 'title.vietnamese', 'content', 'content.vietnamese'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
                { term: { user_id: userId } },
              ],
            },
          },
          highlight: {
            fields: {
              title: {},
              content: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search notifications: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Tasks methods
  async indexTask(task: any) {
    try {
      return await this.esService.index({
        index: this.indices.tasks,
        id: task.task_id.toString(),
        body: task,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index task: ${error.message}`);
      return null;
    }
  }

  async updateTask(task: any) {
    try {
      return await this.esService.update({
        index: this.indices.tasks,
        id: task.task_id.toString(),
        body: {
          doc: task,
        },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi update task: ${error.message}`);
      return null;
    }
  }

  async deleteTask(taskId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.tasks,
        id: taskId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete task: ${error.message}`);
      return null;
    }
  }

  async searchTasks(query: string, status?: string, userId?: number, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      const mustClauses = [
        {
          multi_match: {
            query,
            fields: ['title', 'title.vietnamese', 'description', 'description.vietnamese', 'assigned_to_name', 'assigned_by_name'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
      ];
      
      if (status) {
        mustClauses.push({ term: { status } });
      }
      
      if (userId) {
        mustClauses.push({
          bool: {
            should: [
              { term: { assigned_to: userId } },
              { term: { assigned_by: userId } },
            ],
          },
        });
      }
      
      const response = await this.esService.search({
        index: this.indices.tasks,
        body: {
          query: {
            bool: {
              must: mustClauses,
            },
          },
          highlight: {
            fields: {
              title: {},
              description: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { deadline: { order: 'asc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search tasks: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Users methods
  async indexUser(user: any) {
    try {
      return await this.esService.index({
        index: this.indices.users,
        id: user.user_id.toString(),
        body: user,
      });
    } catch (error) {
      this.logger.error(`Lỗi khi index user: ${error.message}`);
      return null;
    }
  }

  async updateUser(user: any) {
    try {
      return await this.esService.update({
        index: this.indices.users,
        id: user.user_id.toString(),
        body: {
          doc: user,
        },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi update user: ${error.message}`);
      return null;
    }
  }

  async deleteUser(userId: number) {
    try {
      return await this.esService.delete({
        index: this.indices.users,
        id: userId.toString(),
      });
    } catch (error) {
      this.logger.error(`Lỗi khi delete user: ${error.message}`);
      return null;
    }
  }

  async searchUsers(query: string, role?: string, departmentId?: number, page: number = 1, size: number = 10) {
    try {
      const from = (page - 1) * size;
      
      const mustClauses = [
        {
          multi_match: {
            query,
            fields: ['full_name', 'full_name.vietnamese', 'email', 'phone'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
      ];
      
      if (role) {
        mustClauses.push({ term: { role } });
      }
      
      if (departmentId) {
        mustClauses.push({ term: { department_id: departmentId } });
      }
      
      const response = await this.esService.search({
        index: this.indices.users,
        body: {
          query: {
            bool: {
              must: mustClauses,
            },
          },
          highlight: {
            fields: {
              full_name: {},
              email: {},
              phone: {},
            },
          },
          sort: [
            { _score: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      // Format kết quả trả về
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const results = hits.map(hit => {
        const source = hit._source;
        const highlights = hit.highlight || {};
        
        return {
          ...source,
          score: hit._score,
          highlights,
        };
      });
      
      return {
        results,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi search users: ${error.message}`);
      return {
        results: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Utilities for Analytics and Dashboard
  async getForumActivityStats(days: number = 30) {
    try {
      const response = await this.esService.search({
        index: this.indices.forumPosts,
        body: {
          size: 0,
          query: {
            range: {
              created_at: {
                gte: `now-${days}d/d`,
              },
            },
          },
          aggs: {
            posts_per_day: {
              date_histogram: {
                field: 'created_at',
                calendar_interval: 'day',
                format: 'yyyy-MM-dd',
              },
            },
            comments_per_post: {
              histogram: {
                field: 'comment_count',
                interval: 5,
              },
            },
            top_posters: {
              terms: {
                field: 'user_id',
                size: 10,
              },
              aggs: {
                user_name: {
                  terms: {
                    field: 'user_full_name',
                    size: 1,
                  },
                },
              },
            },
          },
        },
      });
      
      return response.aggregations;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy forum activity stats: ${error.message}`);
      return null;
    }
  }

  async getDocumentsStats(days: number = 30) {
    try {
      const response = await this.esService.search({
        index: this.indices.documents,
        body: {
          size: 0,
          query: {
            range: {
              uploaded_at: {
                gte: `now-${days}d/d`,
              },
            },
          },
          aggs: {
            docs_per_day: {
              date_histogram: {
                field: 'uploaded_at',
                calendar_interval: 'day',
                format: 'yyyy-MM-dd',
              },
            },
            docs_per_category: {
              terms: {
                field: 'category',
                size: 10,
              },
            },
            top_uploaders: {
              terms: {
                field: 'uploaded_by',
                size: 10,
              },
              aggs: {
                uploader_name: {
                  terms: {
                    field: 'uploader_name',
                    size: 1,
                  },
                },
              },
            },
          },
        },
      });
      
      return response.aggregations;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy documents stats: ${error.message}`);
      return null;
    }
  }

  async getTasksStats(days: number = 30) {
    try {
      const response = await this.esService.search({
        index: this.indices.tasks,
        body: {
          size: 0,
          query: {
            range: {
              created_at: {
                gte: `now-${days}d/d`,
              },
            },
          },
          aggs: {
            tasks_per_day: {
              date_histogram: {
                field: 'created_at',
                calendar_interval: 'day',
                format: 'yyyy-MM-dd',
              },
            },
            tasks_by_status: {
              terms: {
                field: 'status',
                size: 10,
              },
            },
            tasks_by_user: {
              terms: {
                field: 'assigned_to',
                size: 10,
              },
              aggs: {
                user_name: {
                  terms: {
                    field: 'assigned_to_name',
                    size: 1,
                  },
                },
                avg_score: {
                  avg: {
                    field: 'score',
                  },
                },
              },
            },
            tasks_deadline_histogram: {
              date_histogram: {
                field: 'deadline',
                calendar_interval: 'day',
                format: 'yyyy-MM-dd',
              },
            },
          },
        },
      });
      
      return response.aggregations;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy tasks stats: ${error.message}`);
      return null;
    }
  }

  async getDashboardOverview() {
    try {
      // Tạo một promise array để lấy tất cả dữ liệu cần thiết cho dashboard
      const [forumStats, documentStats, taskStats, userStats, notificationStats] = await Promise.all([
        this.getForumActivityStats(30),
        this.getDocumentsStats(30),
        this.getTasksStats(30),
        this.getUserActivityStats(),
        this.getNotificationStats(),
      ]);
      
      return {
        forumStats,
        documentStats,
        taskStats,
        userStats,
        notificationStats,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy dashboard overview: ${error.message}`);
      return null;
    }
  }

  private async getUserActivityStats() {
    try {
      const response = await this.esService.search({
        index: this.indices.users,
        body: {
          size: 0,
          aggs: {
            users_by_role: {
              terms: {
                field: 'role',
                size: 10,
              },
            },
            users_by_department: {
              terms: {
                field: 'department_id',
                size: 20,
              },
              aggs: {
                department_name: {
                  terms: {
                    field: 'department_name',
                    size: 1,
                  },
                },
              },
            },
          },
        },
      });
      
      return response.aggregations;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy user activity stats: ${error.message}`);
      return null;
    }
  }

  private async getNotificationStats() {
    try {
      const response = await this.esService.search({
        index: this.indices.notifications,
        body: {
          size: 0,
          aggs: {
            notifications_by_type: {
              terms: {
                field: 'type',
                size: 10,
              },
            },
            read_vs_unread: {
              terms: {
                field: 'is_read',
                size: 2,
              },
            },
            notifications_over_time: {
              date_histogram: {
                field: 'created_at',
                calendar_interval: 'day',
                format: 'yyyy-MM-dd',
              },
            },
          },
        },
      });
      
      return response.aggregations;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy notification stats: ${error.message}`);
      return null;
    }
  }

  // Logging and Monitoring
  async logSystemEvent(eventType: string, message: string, details?: any) {
    try {
      const logIndex = 'system_logs';
      
      // Kiểm tra và tạo index nếu chưa tồn tại
      const indexExists = await this.esService.indices.exists({ index: logIndex });
      if (!indexExists) {
        await this.esService.indices.create({
          index: logIndex,
          body: {
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                event_type: { type: 'keyword' },
                message: { type: 'text' },
                details: { type: 'object', enabled: false },
                level: { type: 'keyword' },
              },
            },
          },
        });
      }
      
      // Lưu log
      await this.esService.index({
        index: logIndex,
        body: {
          timestamp: new Date(),
          event_type: eventType,
          message,
          details: details || {},
          level: this.getLogLevel(eventType),
        },
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Lỗi khi ghi log: ${error.message}`);
      return false;
    }
  }
  
  private getLogLevel(eventType: string): string {
    switch (eventType.toLowerCase()) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warn';
      case 'info':
        return 'info';
      case 'debug':
        return 'debug';
      default:
        return 'info';
    }
  }

  async getSystemLogs(level?: string, startDate?: string, endDate?: string, page: number = 1, size: number = 100) {
    try {
      const from = (page - 1) * size;
      
      const query: any = {
        bool: {
          must: [],
        },
      };
      
      if (level) {
        query.bool.must.push({ term: { level } });
      }
      
      if (startDate || endDate) {
        const rangeQuery: any = {
          range: {
            timestamp: {},
          },
        };
        
        if (startDate) {
          rangeQuery.range.timestamp.gte = startDate;
        }
        
        if (endDate) {
          rangeQuery.range.timestamp.lte = endDate;
        }
        
        query.bool.must.push(rangeQuery);
      }
      
      const response = await this.esService.search({
        index: 'system_logs',
        body: {
          query: query.bool.must.length ? query : { match_all: {} },
          sort: [
            { timestamp: { order: 'desc' } },
          ],
          from,
          size,
        },
      });
      
      const hits = response.hits.hits;
      const total = response.hits.total.value;
      
      const logs = hits.map(hit => hit._source);
      
      return {
        logs,
        pagination: {
          total,
          page,
          size,
          pages: Math.ceil(total / size),
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy system logs: ${error.message}`);
      return {
        logs: [],
        pagination: {
          total: 0,
          page,
          size,
          pages: 0,
        },
      };
    }
  }

  // Sync data từ database với Elasticsearch
  async syncForumPosts() {
    this.logger.log('Bắt đầu đồng bộ hóa forum posts với Elasticsearch...');
    // Được thực hiện bởi CronJob
    return true;
  }

  async syncDocuments() {
    this.logger.log('Bắt đầu đồng bộ hóa documents với Elasticsearch...');
    // Được thực hiện bởi CronJob
    return true;
  }

  async syncTasks() {
    this.logger.log('Bắt đầu đồng bộ hóa tasks với Elasticsearch...');
    // Được thực hiện bởi CronJob
    return true;
  }

  async syncNotifications() {
    this.logger.log('Bắt đầu đồng bộ hóa notifications với Elasticsearch...');
    // Được thực hiện bởi CronJob
    return true;
  }

  async syncUsers() {
    this.logger.log('Bắt đầu đồng bộ hóa users với Elasticsearch...');
    // Được thực hiện bởi CronJob
    return true;
  }
}