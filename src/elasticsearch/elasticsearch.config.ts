// src/elasticsearch/elasticsearch.config.ts
import { ConfigService } from '@nestjs/config';
import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

export const getElasticsearchConfig = (
  configService: ConfigService
): ElasticsearchModuleOptions => {
  const host = configService.get<string>('ELASTICSEARCH_HOST') || 'http://localhost:9200';
  const username = configService.get<string>('ELASTICSEARCH_USERNAME');
  const password = configService.get<string>('ELASTICSEARCH_PASSWORD');
  
  const config: ElasticsearchModuleOptions = {
    node: host,
  };
  
  if (username && password) {
    config.auth = {
      username,
      password
    };
  }
  
  return config;
};