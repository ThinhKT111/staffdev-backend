// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService as BaseElasticsearchService } from '@nestjs/elasticsearch';
import { Task } from '../entities/task.entity';
import { Document } from '../entities/document.entity';
import { Notification } from '../entities/notification.entity';
import { ForumPost } from '../entities/forum-post.entity';

export interface SearchTasksResult {
  totalCount: number;
  items: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    deadline: Date;
    created_at: Date;
    updated_at: Date;
  }>;
}

export interface SearchDocumentsResult {
  totalCount: number;
  items: Array<{
    id: number;
    title: string;
    category: string;
    uploaded_at: Date;
  }>;
}

export interface SearchNotificationsResult {
  totalCount: number;
  items: Array<{
    id: number;
    title: string;
    content: string;
    created_at: Date;
  }>;
}

// Simplified type for elasticsearch aggregations buckets
interface ElasticsearchBucket {
  key: string;
  doc_count: number;
}

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly taskIndex = 'tasks';
  private readonly documentIndex = 'documents';
  private readonly notificationIndex = 'notifications';
  private isElasticsearchAvailable = false;

  constructor(private readonly esService: BaseElasticsearchService) {
    this.initIndices();
  }

  private async initIndices(): Promise<void> {
    try {
      // Check if Elasticsearch is available
      this.isElasticsearchAvailable = await this.checkHealth();
      
      if (!this.isElasticsearchAvailable) {
        this.logger.warn('Elasticsearch is not available. Skipping index initialization.');
        return;
      }

      // Create tasks index if it doesn't exist
      const tasksExists = await this.esService.indices.exists({
        index: this.taskIndex,
      });

      if (!tasksExists) {
        await this.esService.indices.create({
          index: this.taskIndex,
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              description: { type: 'text' },
              status: { type: 'keyword' },
              deadline: { type: 'date' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
            }
          }
        });
        this.logger.log(`Created index: ${this.taskIndex}`);
      }

      // Create documents index if it doesn't exist
      const documentsExists = await this.esService.indices.exists({
        index: this.documentIndex,
      });

      if (!documentsExists) {
        await this.esService.indices.create({
          index: this.documentIndex,
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              category: { type: 'keyword' },
              content: { type: 'text' },
              uploaded_at: { type: 'date' },
            }
          }
        });
        this.logger.log(`Created index: ${this.documentIndex}`);
      }

      // Create notifications index if it doesn't exist
      const notificationsExists = await this.esService.indices.exists({
        index: this.notificationIndex,
      });

      if (!notificationsExists) {
        await this.esService.indices.create({
          index: this.notificationIndex,
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              content: { type: 'text' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
            }
          }
        });
        this.logger.log(`Created index: ${this.notificationIndex}`);
      }
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.error('Error initializing Elasticsearch indices', error);
    }
  }

  getElasticsearchAvailability(): boolean {
    return this.isElasticsearchAvailable;
  }

  async indexTask(task: Task): Promise<void> {
    await this.withFallback(async () => {
      await this.esService.index({
        index: this.taskIndex,
        id: task.task_id.toString(),
        document: {
          id: task.task_id,
          title: task.title,
          description: task.description,
          status: task.status,
          deadline: task.deadline,
          created_at: task.created_at,
          updated_at: task.updated_at,
        },
      });
      return true;
    }, false);
  }

  async indexNotification(notification: Notification): Promise<void> {
    await this.withFallback(async () => {
      await this.esService.index({
        index: this.notificationIndex,
        id: notification.notification_id.toString(),
        document: {
          id: notification.notification_id,
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          is_read: notification.is_read,
          created_at: notification.created_at,
        },
      });
      return true;
    }, false);
  }

  async removeNotificationFromIndex(notificationId: number): Promise<void> {
    await this.withFallback(async () => {
      await this.esService.delete({
        index: this.notificationIndex,
        id: notificationId.toString(),
      });
      return true;
    }, false);
  }

  async searchTasks(
    query: string,
    status?: string[],
    fromDate?: string,
    toDate?: string,
    page = 1,
    limit = 10
  ): Promise<SearchTasksResult> {
    return this.withFallback(async () => {
      const from = (page - 1) * limit;

      // Build search query
      const searchQuery: any = {
        bool: {
          must: [],
        },
      };

      if (query) {
        searchQuery.bool.must.push({
          multi_match: {
            query,
            fields: ['title', 'description'],
            fuzziness: 'AUTO',
          },
        });
      }

      // Filter by status if provided
      if (status && status.length > 0) {
        searchQuery.bool.must.push({
          terms: {
            status: status,
          },
        });
      }

      // Filter by date range if provided
      if (fromDate || toDate) {
        const rangeFilter: any = {
          range: {
            deadline: {},
          },
        };

        if (fromDate) {
          rangeFilter.range.deadline.gte = fromDate;
        }

        if (toDate) {
          rangeFilter.range.deadline.lte = toDate;
        }

        searchQuery.bool.must.push(rangeFilter);
      }

      const response = await this.esService.search({
        index: this.taskIndex,
        query: searchQuery,
        sort: [{ updated_at: { order: 'desc' } }],
        from,
        size: limit,
      });

      const totalHits = response.hits.total;
      const totalCount = typeof totalHits === 'number' 
        ? totalHits 
        : (totalHits?.value || 0);

      const items = response.hits.hits.map((hit: any) => {
        const source = hit._source;
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          status: source.status,
          deadline: new Date(source.deadline),
          created_at: new Date(source.created_at),
          updated_at: new Date(source.updated_at),
        };
      });

      return {
        totalCount,
        items,
      };
    }, { totalCount: 0, items: [] });
  }

  async searchDocuments(
    query: string,
    category?: string,
    page = 1,
    limit = 10
  ): Promise<SearchDocumentsResult> {
    return this.withFallback(async () => {
      const from = (page - 1) * limit;

      // Build search query
      const searchQuery: any = {};

      if (query) {
        searchQuery.multi_match = {
          query,
          fields: ['title', 'content'],
          fuzziness: 'AUTO',
        };
      }

      // Filter by category if provided
      if (category) {
        searchQuery.bool = {
          must: [
            { term: { category } }
          ]
        };

        if (query) {
          searchQuery.bool.must.push({
            multi_match: {
              query,
              fields: ['title', 'content'],
              fuzziness: 'AUTO',
            }
          });
          delete searchQuery.multi_match;
        }
      }

      const response = await this.esService.search({
        index: this.documentIndex,
        query: searchQuery,
        sort: [{ uploaded_at: { order: 'desc' } }],
        from,
        size: limit,
      });

      const totalHits = response.hits.total;
      const totalCount = typeof totalHits === 'number' 
        ? totalHits 
        : (totalHits?.value || 0);

      const items = response.hits.hits.map((hit: any) => {
        const source = hit._source;
        return {
          id: source.id,
          title: source.title,
          category: source.category,
          uploaded_at: new Date(source.uploaded_at),
        };
      });

      return {
        totalCount,
        items,
      };
    }, { totalCount: 0, items: [] });
  }

  async getDocumentStatistics(): Promise<any> {
    return this.withFallback(async () => {
      const response = await this.esService.search({
        index: this.documentIndex,
        size: 0,
        aggs: {
          categories: {
            terms: {
              field: 'category.keyword',
              size: 20,
            },
          },
        },
      });

      // Cast aggregations to expected structure to handle typing issues
      const categoriesAgg = response.aggregations?.categories as any;
      const buckets = categoriesAgg?.buckets as ElasticsearchBucket[] || [];

      // Get recent documents
      const recentResponse = await this.esService.search({
        index: this.documentIndex,
        query: { match_all: {} },
        sort: [{ uploaded_at: { order: 'desc' } }],
        size: 5,
      });

      const recent = recentResponse.hits.hits.map((hit: any) => {
        const source = hit._source;
        return {
          id: source.id,
          title: source.title,
          category: source.category,
          uploaded_at: new Date(source.uploaded_at),
        };
      });

      return {
        categories: buckets.map((bucket) => ({
          category: bucket.key,
          count: bucket.doc_count,
        })),
        recentDocuments: recent,
      };
    }, { categories: [], recentDocuments: [] });
  }

  async searchNotifications(
    query: string,
    page = 1,
    limit = 10
  ): Promise<SearchNotificationsResult> {
    return this.withFallback(async () => {
      const from = (page - 1) * limit;

      const searchQuery = query ? {
        multi_match: {
          query,
          fields: ['title', 'content'],
          fuzziness: 'AUTO',
        },
      } : {
        match_all: {},
      };

      const response = await this.esService.search({
        index: this.notificationIndex,
        query: searchQuery,
        sort: [{ created_at: { order: 'desc' } }],
        from,
        size: limit,
      });

      const totalHits = response.hits.total;
      const totalCount = typeof totalHits === 'number' 
        ? totalHits 
        : (totalHits?.value || 0);

      const items = response.hits.hits.map((hit: any) => {
        const source = hit._source;
        return {
          id: source.id,
          title: source.title,
          content: source.content,
          created_at: new Date(source.created_at),
        };
      });

      return {
        totalCount,
        items,
      };
    }, { totalCount: 0, items: [] });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const health = await this.esService.cluster.health({
        timeout: '5s'
      });
      return health.status !== 'red';
    } catch (error) {
      this.logger.warn('Elasticsearch health check failed, service will run in fallback mode', error.message);
      return false;
    }
  }

  private async withFallback<T>(operation: () => Promise<T>, defaultValue: T): Promise<T> {
    if (!this.isElasticsearchAvailable) {
      return defaultValue;
    }
    
    try {
      return await operation();
    } catch (error) {
      if (error.name === 'ConnectionError') {
        this.isElasticsearchAvailable = false;
        this.logger.warn('Elasticsearch connection lost, switching to fallback mode');
      } else {
        this.logger.error('Elasticsearch operation failed', error);
      }
      return defaultValue;
    }
  }
}