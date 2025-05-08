// src/elasticsearch/elasticsearch.config.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchConfig implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchConfig.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Kiểm tra kết nối Elasticsearch
    try {
      await this.elasticsearchService.ping();
      this.logger.log('Elasticsearch connection successful');
    } catch (error) {
      this.logger.warn(`Elasticsearch connection failed: ${error.message}`);
      this.logger.warn('Search functionality will be limited to database queries');
    }
  }
}