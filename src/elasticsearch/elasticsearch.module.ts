// src/elasticsearch/elasticsearch.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME') || 'elastic',
          password: configService.get('ELASTICSEARCH_PASSWORD') || 'changeme',
        },
        tls: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class AppElasticsearchModule {}