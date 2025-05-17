// src/elasticsearch/elasticsearch.config.ts
import { ConfigService } from '@nestjs/config';
import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

export const getElasticsearchConfig = (
  configService: ConfigService
): ElasticsearchModuleOptions => {
  const host = configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
  const username = configService.get<string>('ELASTICSEARCH_USERNAME');
  const password = configService.get<string>('ELASTICSEARCH_PASSWORD');
  
  const config: ElasticsearchModuleOptions = {
    node: host,
    maxRetries: 3,
    requestTimeout: 10000,
    tls: {
      rejectUnauthorized: configService.get<string>('SSL_REJECT_UNAUTHORIZED') !== 'false'
    }
  };
  
  if (username && password) {
    config.auth = {
      username,
      password
    };
  }
  
  return config;
};