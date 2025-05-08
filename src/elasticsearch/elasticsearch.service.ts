// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { TaskStatus } from '../entities/task.entity';
import { NotificationType } from '../entities/notification.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private isAvailable = false;
  private readonly indices = {
    users: 'users',
    tasks: 'tasks',
    documents: 'documents',
    forumPosts: 'forum-posts',
    forumComments: 'forum-comments',
    notifications: 'notifications',
  };

  constructor(
    private readonly elasticsearchService: NestElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Kiểm tra kết nối Elasticsearch và tạo indices nếu cần
    try {
      await this.elasticsearchService.ping();
      this.isAvailable = true;
      this.logger.log('Elasticsearch connected successfully');

      // Tạo các indices nếu chưa tồn tại
      await this.createIndicesIfNotExist();
    } catch (error) {
      this.isAvailable = false;
      this.logger.warn(`Elasticsearch connection failed: ${error.message}`);
      this.logger.warn('Search functionality will be limited to database queries');
    }
  }

  // Kiểm tra trạng thái kết nối Elasticsearch
  getElasticsearchAvailability(): boolean {
    return this.isAvailable;
  }

  // Tạo các indices nếu chưa tồn tại
  private async createIndicesIfNotExist() {
    try {
      // Tạo index cho users
      if (!(await this.indexExists(this.indices.users))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.users,
          body: {
            mappings: {
              properties: {
                user_id: { type: 'keyword' },
                full_name: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                email: { type: 'keyword' },
                phone: { type: 'keyword' },
                department_name: { type: 'keyword' },
                role: { type: 'keyword' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.users} index`);
      }

      // Tạo index cho tasks
      if (!(await this.indexExists(this.indices.tasks))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.tasks,
          body: {
            mappings: {
              properties: {
                task_id: { type: 'keyword' },
                title: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                description: { type: 'text' },
                assigned_to: { type: 'keyword' },
                assigned_by: { type: 'keyword' },
                assignee_name: { type: 'text' },
                assigner_name: { type: 'text' },
                status: { type: 'keyword' },
                deadline: { type: 'date' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.tasks} index`);
      }

      // Tạo index cho documents
      if (!(await this.indexExists(this.indices.documents))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.documents,
          body: {
            mappings: {
              properties: {
                document_id: { type: 'keyword' },
                title: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { type: 'text' },
                category: { type: 'keyword' },
                uploaded_by: { type: 'keyword' },
                uploader_name: { type: 'text' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' }
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.documents} index`);
      }

      // Tạo index cho forum posts
      if (!(await this.indexExists(this.indices.forumPosts))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.forumPosts,
          body: {
            mappings: {
              properties: {
                post_id: { type: 'keyword' },
                title: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { type: 'text' },
                user_id: { type: 'keyword' },
                author_name: { type: 'text' },
                comment_count: { type: 'integer' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' }
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.forumPosts} index`);
      }

      // Tạo index cho forum comments
      if (!(await this.indexExists(this.indices.forumComments))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.forumComments,
          body: {
            mappings: {
              properties: {
                comment_id: { type: 'keyword' },
                post_id: { type: 'keyword' },
                user_id: { type: 'keyword' },
                author_name: { type: 'text' },
                content: { type: 'text' },
                created_at: { type: 'date' }
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.forumComments} index`);
      }

      // Tạo index cho notifications
      if (!(await this.indexExists(this.indices.notifications))) {
        await this.elasticsearchService.indices.create({
          index: this.indices.notifications,
          body: {
            mappings: {
              properties: {
                notification_id: { type: 'keyword' },
                user_id: { type: 'keyword' },
                title: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { type: 'text' },
                type: { type: 'keyword' },
                is_read: { type: 'boolean' },
                created_at: { type: 'date' }
              }
            }
          }
        });
        this.logger.log(`Created ${this.indices.notifications} index`);
      }
    } catch (error) {
      this.logger.error(`Error creating indices: ${error.message}`);
      this.isAvailable = false;
    }
  }

  // Kiểm tra index có tồn tại không
  private async indexExists(indexName: string): Promise<boolean> {
    try {
      const { body } = await this.elasticsearchService.indices.exists({ index: indexName });
      return body;
    } catch (error) {
      this.logger.error(`Error checking index ${indexName}: ${error.message}`);
      return false;
    }
  }

  // Tìm kiếm người dùng
  async searchUsers(query: string, from: number = 0, size: number = 10): Promise<{ results: any[], total: number }> {
    if (!this.isAvailable) {
      return { results: [], total: 0 };
    }

    try {
      const { body } = await this.elasticsearchService.search({
        index: this.indices.users,
        body: {
          from,
          size,
          query: {
            multi_match: {
              query,
              fields: ['full_name^2', 'email', 'phone', 'department_name'],
              fuzziness: 'AUTO'
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const total = body.hits.total.value || 0;
      const results = body.hits.hits.map(hit => hit._source);

      return { results, total };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Tìm kiếm tài liệu
  async searchDocuments(query: string, category?: string, from: number = 0, size: number = 10): Promise<{ results: any[], total: number }> {
    if (!this.isAvailable) {
      return { results: [], total: 0 };
    }

    try {
      let queryBody: any = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'content^2', 'category', 'uploader_name'],
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      };

      if (category) {
        queryBody.bool.filter = [
          { term: { category } }
        ];
      }

      const { body } = await this.elasticsearchService.search({
        index: this.indices.documents,
        body: {
          from,
          size,
          query: queryBody,
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const total = body.hits.total.value || 0;
      const results = body.hits.hits.map(hit => hit._source);

      return { results, total };
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Tìm kiếm nhiệm vụ
  async searchTasks(query: string, status?: TaskStatus, from: number = 0, size: number = 10): Promise<{ results: any[], total: number }> {
    if (!this.isAvailable) {
      return { results: [], total: 0 };
    }

    try {
      let queryBody: any = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'description^2', 'assignee_name', 'assigner_name'],
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      };

      if (status) {
        queryBody.bool.filter = [
          { term: { status } }
        ];
      }

      const { body } = await this.elasticsearchService.search({
        index: this.indices.tasks,
        body: {
          from,
          size,
          query: queryBody,
          sort: [
            { _score: { order: 'desc' } },
            { deadline: { order: 'asc' } },
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const total = body.hits.total.value || 0;
      const results = body.hits.hits.map(hit => hit._source);

      return { results, total };
    } catch (error) {
      this.logger.error(`Error searching tasks: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Tìm kiếm bài viết diễn đàn
  async searchForumPosts(query: string, from: number = 0, size: number = 10): Promise<{ results: any[], total: number }> {
    if (!this.isAvailable) {
      return { results: [], total: 0 };
    }

    try {
      const { body } = await this.elasticsearchService.search({
        index: this.indices.forumPosts,
        body: {
          from,
          size,
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'content^2', 'author_name'],
              fuzziness: 'AUTO'
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const total = body.hits.total.value || 0;
      const results = body.hits.hits.map(hit => hit._source);

      return { results, total };
    } catch (error) {
      this.logger.error(`Error searching forum posts: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Tìm kiếm bình luận diễn đàn
  async searchForumComments(query: string, postId?: number, from: number = 0, size: number = 10): Promise<{ results: any[], total: number }> {
    if (!this.isAvailable) {
      return { results: [], total: 0 };
    }

    try {
      let queryBody: any = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['content^2', 'author_name'],
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      };

      if (postId) {
        queryBody.bool.filter = [
          { term: { post_id: postId.toString() } }
        ];
      }

      const { body } = await this.elasticsearchService.search({
        index: this.indices.forumComments,
        body: {
          from,
          size,
          query: queryBody,
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const total = body.hits.total.value || 0;
      const results = body.hits.hits.map(hit => hit._source);

      return { results, total };
    } catch (error) {
      this.logger.error(`Error searching forum comments: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Lấy danh sách categories từ documents
  async getDocumentCategories(): Promise<string[]> {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const { body } = await this.elasticsearchService.search({
        index: this.indices.documents,
        body: {
          size: 0,
          aggs: {
            categories: {
              terms: {
                field: 'category.keyword',
                size: 100
              }
            }
          }
        }
      });

      const categoryBuckets = body.aggregations?.categories?.buckets || [];
      return categoryBuckets.map(bucket => bucket.key);
    } catch (error) {
      this.logger.error(`Error getting document categories: ${error.message}`);
      return [];
    }
  }

  // Index user
  async indexUser(user: any): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.users,
        id: user.user_id.toString(),
        document: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          department_name: user.department?.department_name || '',
          role: user.role,
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

  // Index forum post
  async indexForumPost(post: any, commentCount: number = 0): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.forumPosts,
        id: post.post_id.toString(),
        document: {
          post_id: post.post_id,
          title: post.title,
          content: post.content,
          user_id: post.user_id,
          author_name: post.user?.full_name || '',
          comment_count: commentCount,
          created_at: post.created_at,
          updated_at: post.updated_at
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing forum post: ${error.message}`);
      return false;
    }
  }

  // Index document
  async indexDocument(document: any): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.documents,
        id: document.document_id.toString(),
        document: {
          document_id: document.document_id,
          title: document.title,
          category: document.category,
          uploaded_by: document.uploaded_by,
          uploader_name: document.uploader?.full_name || '',
          created_at: document.uploaded_at,
          updated_at: document.uploaded_at,
          content: document.content || ''
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`);
      return false;
    }
  }

  // Index task
  async indexTask(task: any): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.tasks,
        id: task.task_id.toString(),
        document: {
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
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing task: ${error.message}`);
      return false;
    }
  }

  // Index notification
  async indexNotification(notification: any): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.notifications,
        id: notification.notification_id.toString(),
        document: {
          notification_id: notification.notification_id,
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at
        },
        refresh: true
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing notification: ${error.message}`);
      return false;
    }
  }

  // Index forum comment
  async indexForumComment(comment: any): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.index({
        index: this.indices.forumComments,
        id: comment.comment_id.toString(),
        document: {
          comment_id: comment.comment_id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          author_name: comment.user?.full_name || '',
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

  // Remove user from index
  async removeUserFromIndex(userId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.users,
        id: userId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing user from index: ${error.message}`);
      return false;
    }
  }

  // Remove forum post from index
  async removeForumPostFromIndex(postId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.forumPosts,
        id: postId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing forum post from index: ${error.message}`);
      return false;
    }
  }

  // Remove document from index
  async removeDocumentFromIndex(documentId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.documents,
        id: documentId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing document from index: ${error.message}`);
      return false;
    }
  }

  // Remove task from index
  async removeTaskFromIndex(taskId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.tasks,
        id: taskId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing task from index: ${error.message}`);
      return false;
    }
  }

  // Remove notification from index
  async removeNotificationFromIndex(notificationId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.notifications,
        id: notificationId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing notification from index: ${error.message}`);
      return false;
    }
  }

  // Remove forum comment from index
  async removeForumCommentFromIndex(commentId: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await this.elasticsearchService.delete({
        index: this.indices.forumComments,
        id: commentId.toString()
      });
      return true;
    } catch (error) {
      this.logger.error(`Error removing forum comment from index: ${error.message}`);
      return false;
    }
  }
}