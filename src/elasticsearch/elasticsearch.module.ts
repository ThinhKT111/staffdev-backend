// src/elasticsearch/elasticsearch.module.ts
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticsearchService } from './elasticsearch.service';
import { ElasticsearchController } from './elasticsearch.controller';

@Module({
  imports: [
    NestElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('ElasticsearchModule');
        const node = configService.get('ELASTICSEARCH_NODE') || 'https://localhost:9200';
        const username = configService.get('ELASTICSEARCH_USERNAME') || 'elastic';
        const password = configService.get('ELASTICSEARCH_PASSWORD') || '26121999';
        
        logger.log(`Configuring Elasticsearch connection to: ${node}`);
        
        // Disable TLS certificate verification for self-signed certs
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        return {
          node,
          auth: {
            username,
            password,
          },
          maxRetries: 10,
          requestTimeout: 60000,
          pingTimeout: 10000,
          sniffOnStart: true,
          tls: {
            rejectUnauthorized: false
          },
          resurrectStrategy: 'ping',
          compression: true,
          healthCheck: {
            enabled: true,
          },
          // Xử lý sự kiện kết nối
          events: {
            async response(error) {
              if (error) {
                logger.error(`Elasticsearch error: ${error.message}`);
              }
            },
            reconnect() {
              logger.log('Elasticsearch client is reconnecting');
            }
          }
        };
      },
    }),
  ],
  providers: [ElasticsearchService],
  controllers: [ElasticsearchController],
  exports: [ElasticsearchService],
})
export class AppElasticsearchModule {}