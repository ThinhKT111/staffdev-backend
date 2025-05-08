// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { TaskStatus } from '../entities/task.entity';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private indexPrefix: string;
  private isConnected: boolean = false;

  constructor(
    private readonly esService: NestElasticsearchService,
    private configService: ConfigService
  ) {
    // Prefix cho các index
    this.indexPrefix = this.configService.get<string>('ELASTICSEARCH_INDEX_PREFIX') || 'staffdev';
  }

  async onModuleInit() {
    try {
      // Kiểm tra kết nối
      const health = await this.esService.cluster.health();
      this.logger.log(`Elasticsearch connected, cluster status: ${health.status}`);
      this.isConnected = true;
      
      // Kiểm tra và tạo các index nếu cần
      await this.ensureIndexes();
    } catch (error) {
      this.logger.error(`Failed to connect to Elasticsearch: ${error.message}`);
      this.isConnected = false;
    }
  }

  private async ensureIndexes(): Promise<void> {
    try {
      // Danh sách các index cần tạo
      const indexes = [
        `${this.indexPrefix}_tasks`,
        `${this.indexPrefix}_users`,
        `${this.indexPrefix}_documents`,
        `${this.indexPrefix}_courses`,
        `${this.indexPrefix}_forum_posts`,
        `${this.indexPrefix}_notifications`
      ];
      
      for (const index of indexes) {
        const exists = await this.esService.indices.exists({ index });
        
        if (!exists) {
          this.logger.log(`Creating index: ${index}`);
          
          await this.esService.indices.create({
            index,
            body: {
              mappings: {
                properties: {
                  id: { type: 'keyword' },
                  title: { type: 'text' },
                  content: { type: 'text' },
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' }
                }
              }
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to ensure indexes: ${error.message}`);
    }
  }

  // Tìm kiếm task
  async searchTasks(keyword: string, status?: TaskStatus, limit: number = 10): Promise<any> {
    if (!this.isConnected) {
      return { results: [], total: 0 };
    }
    
    try {
      // Xây dựng query
      const query: any = {
        bool: {
          must: [
            {
              multi_match: {
                query: keyword,
                fields: ['title', 'description']
              }
            }
          ]
        }
      };
      
      // Thêm filter theo status nếu có
      if (status) {
        query.bool.must.push({
          term: { status }
        });
      }
      
      // Thực hiện search
      const response = await this.esService.search({
        index: `${this.indexPrefix}_tasks`,
        body: {
          query,
          size: limit,
          sort: [
            { deadline: { order: 'asc' } }
          ]
        }
      });
      
      // Chuyển đổi response
      const hits = response.hits?.hits || [];
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;
      
      return {
        results: hits.map(hit => ({ 
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        total
      };
    } catch (error) {
      this.logger.error(`Search tasks error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Kiểm tra kết nối và trạng thái cluster
  async checkHealth(): Promise<any> {
    try {
      const health = await this.esService.cluster.health();
      const info = await this.esService.info();
      
      return {
        status: health.status,
        clusterName: health.cluster_name,
        nodeCount: health.number_of_nodes,
        esVersion: info.version.number,
        connected: this.isConnected
      };
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);
      return {
        status: 'red',
        connected: false,
        error: error.message
      };
    }
  }

  // Kiểm tra xem Elasticsearch có khả dụng không
  getElasticsearchAvailability(): boolean {
    return this.isConnected;
  }

  // Phương thức mới để tìm kiếm thông báo
  async searchNotifications(userId: number, keyword: string, limit: number = 10): Promise<any> {
    if (!this.isConnected) {
      return { results: [], total: 0 };
    }
    
    try {
      // Xây dựng query
      const query: any = {
        bool: {
          must: [
            {
              term: { user_id: userId }
            },
            {
              multi_match: {
                query: keyword,
                fields: ['title', 'content']
              }
            }
          ]
        }
      };
      
      // Thực hiện search
      const response = await this.esService.search({
        index: `${this.indexPrefix}_notifications`,
        body: {
          query,
          size: limit,
          sort: [
            { created_at: { order: 'desc' } }
          ]
        }
      });
      
      // Chuyển đổi response
      const hits = response.hits?.hits || [];
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;
      
      return {
        results: hits.map(hit => ({ 
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        total
      };
    } catch (error) {
      this.logger.error(`Search notifications error: ${error.message}`);
      return { results: [], total: 0 };
    }
  }

  // Phương thức để chỉ mục một thông báo
  async indexNotification(notification: any): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.esService.index({
        index: `${this.indexPrefix}_notifications`,
        id: notification.notification_id.toString(),
        body: {
          user_id: notification.user_id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at
        }
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Index notification error: ${error.message}`);
      return false;
    }
  }

  // Phương thức để xóa một thông báo khỏi chỉ mục
  async removeNotificationFromIndex(id: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.esService.delete({
        index: `${this.indexPrefix}_notifications`,
        id: id.toString()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Remove notification from index error: ${error.message}`);
      return false;
    }
  }

  // Phương thức mới để lấy thống kê tài liệu
  async getDocumentStatistics(): Promise<any> {
    if (!this.isConnected) {
      return {
        totalDocuments: 0,
        categoriesCount: [],
        recentUploads: []
      };
    }
    
    try {
      // Lấy tổng số tài liệu
      const countResponse = await this.esService.count({
        index: `${this.indexPrefix}_documents`
      });
      
      // Lấy thống kê theo category
      const categoryResponse = await this.esService.search({
        index: `${this.indexPrefix}_documents`,
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
      });
      
      // Lấy các tài liệu gần đây
      const recentResponse = await this.esService.search({
        index: `${this.indexPrefix}_documents`,
        body: {
          size: 5,
          sort: [
            { uploaded_at: { order: 'desc' } }
          ]
        }
      });
      
      // Xử lý kết quả truy vấn
      const total = countResponse.count;
      
      // Xử lý kết quả thống kê theo danh mục
      let categoriesCount = [];
      if (categoryResponse.aggregations && 
          categoryResponse.aggregations.categories && 
          categoryResponse.aggregations.categories.buckets) {
        categoriesCount = categoryResponse.aggregations.categories.buckets.map(bucket => ({
          category: bucket.key,
          count: bucket.doc_count
        }));
      }
      
      // Xử lý kết quả tài liệu gần đây
      const recentHits = recentResponse.hits?.hits || [];
      const recentUploads = recentHits.map(hit => ({
        id: hit._id,
        ...hit._source
      }));
      
      return {
        totalDocuments: total,
        categoriesCount,
        recentUploads
      };
    } catch (error) {
      this.logger.error(`Get document statistics error: ${error.message}`);
      return {
        totalDocuments: 0,
        categoriesCount: [],
        recentUploads: []
      };
    }
  }
}