// src/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private indices = {
    tasks: 'tasks',
    documents: 'documents',
    forum_posts: 'forum_posts',
  };

  constructor(
    private readonly esService: NestElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.checkConnection();
      await this.createIndices();
    } catch (error) {
      this.logger.warn(`Elasticsearch initialization failed: ${error.message}`);
    }
  }

  private async checkConnection() {
    try {
      const info = await this.esService.info();
      this.logger.log(`Connected to Elasticsearch: ${info.version.number}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to connect to Elasticsearch: ${error.message}`);
      return false;
    }
  }

  private async createIndices() {
    const indexPromises = [
      this.createTasksIndex(),
      this.createDocumentsIndex(),
      this.createForumPostsIndex(),
    ];

    await Promise.all(indexPromises);
  }

  private async createTasksIndex() {
    try {
      const exists = await this.esService.indices.exists({ index: this.indices.tasks });
      
      if (!exists) {
        await this.esService.indices.create({
          index: this.indices.tasks,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text' },
                description: { type: 'text' },
                status: { type: 'keyword' },
                deadline: { type: 'date' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Created index: ${this.indices.tasks}`);
      }
    } catch (error) {
      this.logger.error(`Error creating tasks index: ${error.message}`);
    }
  }

  private async createDocumentsIndex() {
    try {
      const exists = await this.esService.indices.exists({ index: this.indices.documents });
      
      if (!exists) {
        await this.esService.indices.create({
          index: this.indices.documents,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text' },
                category: { type: 'keyword' },
                content: { type: 'text' },
                uploaded_at: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Created index: ${this.indices.documents}`);
      }
    } catch (error) {
      this.logger.error(`Error creating documents index: ${error.message}`);
    }
  }

  private async createForumPostsIndex() {
    try {
      const exists = await this.esService.indices.exists({ index: this.indices.forum_posts });
      
      if (!exists) {
        await this.esService.indices.create({
          index: this.indices.forum_posts,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text' },
                content: { type: 'text' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Created index: ${this.indices.forum_posts}`);
      }
    } catch (error) {
      this.logger.error(`Error creating forum_posts index: ${error.message}`);
    }
  }

  // Index a task
  async indexTask(task: any) {
    try {
      await this.esService.index({
        index: this.indices.tasks,
        id: task.task_id.toString(),
        document: {
          id: task.task_id.toString(),
          title: task.title,
          description: task.description,
          status: task.status,
          deadline: task.deadline,
          created_at: task.created_at,
          updated_at: task.updated_at,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing task: ${error.message}`);
      return false;
    }
  }

  // Get upcoming task deadlines
  async getUpcomingTasks(limit = 10) {
    try {
      const response = await this.esService.search({
        index: this.indices.tasks,
        body: {
          size: limit,
          query: {
            bool: {
              must: [
                {
                  range: {
                    deadline: {
                      gte: 'now',
                      lte: 'now+7d',
                    },
                  },
                },
                {
                  terms: {
                    status: ['Pending', 'InProgress'],
                  },
                },
              ],
            },
          },
          sort: [
            { deadline: { order: 'asc' } },
          ],
        },
      });

      if (response.hits.total.value === 0) {
        return [];
      }

      return response.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source,
      }));
    } catch (error) {
      this.logger.error(`Error getting upcoming tasks: ${error.message}`);
      return [];
    }
  }

  // Index a document
  async indexDocument(document: any) {
    try {
      await this.esService.index({
        index: this.indices.documents,
        id: document.document_id.toString(),
        document: {
          id: document.document_id.toString(),
          title: document.title,
          category: document.category,
          uploaded_at: document.uploaded_at,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing document: ${error.message}`);
      return false;
    }
  }

  // Search documents
  async searchDocuments(query: string, limit = 10) {
    try {
      const response = await this.esService.search({
        index: this.indices.documents,
        body: {
          size: limit,
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'category^2'],
              fuzziness: 'AUTO',
            },
          },
          sort: [
            { uploaded_at: { order: 'desc' } },
          ],
        },
      });

      if (response.hits.total.value === 0) {
        return [];
      }

      return response.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source,
      }));
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      return [];
    }
  }

  // Index a forum post
  async indexForumPost(post: any) {
    try {
      await this.esService.index({
        index: this.indices.forum_posts,
        id: post.post_id.toString(),
        document: {
          id: post.post_id.toString(),
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error indexing forum post: ${error.message}`);
      return false;
    }
  }

  // Get document categories with count
  async getDocumentCategories() {
    try {
      const response = await this.esService.search({
        index: this.indices.documents,
        body: {
          size: 0,
          aggs: {
            categories: {
              terms: {
                field: 'category',
                size: 10,
              },
            },
          },
        },
      });

      if (!response.aggregations) {
        return [];
      }

      const categories = response.aggregations.categories;
      const buckets = 'buckets' in categories ? categories.buckets : [];
      
      return buckets.map((bucket: any) => ({
        category: bucket.key,
        count: bucket.doc_count,
      }));
    } catch (error) {
      this.logger.error(`Error getting document categories: ${error.message}`);
      return [];
    }
  }

  // Recent document uploads
  async getRecentDocuments(limit = 5) {
    try {
      const response = await this.esService.search({
        index: this.indices.documents,
        body: {
          size: limit,
          sort: [
            { uploaded_at: { order: 'desc' } },
          ],
        },
      });

      if (response.hits.total.value === 0) {
        return [];
      }

      return response.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source,
      }));
    } catch (error) {
      this.logger.error(`Error getting recent documents: ${error.message}`);
      return [];
    }
  }
}