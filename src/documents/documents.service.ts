// src/documents/documents.service.ts
import { BadRequestException, Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FileUploadService } from '../shared/file-upload.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import * as pdf from 'pdf-parse';
import * as docx from 'docx-parser';
import * as textract from 'textract';

@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);
  private isElasticsearchAvailable = false;

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private fileUploadService: FileUploadService,
    private elasticsearchService: ElasticsearchService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Kiểm tra Elasticsearch có khả dụng không
    try {
      await this.elasticsearchService.isElasticsearchAvailable();
      this.isElasticsearchAvailable = true;
      this.logger.log('Elasticsearch khả dụng cho DocumentsService');
      
      // Đồng bộ dữ liệu documents vào Elasticsearch
      this.syncDocumentsToElasticsearch();
    } catch (error) {
      this.isElasticsearchAvailable = false;
      this.logger.warn('Elasticsearch không khả dụng cho DocumentsService');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncDocumentsToElasticsearch() {
    if (!this.isElasticsearchAvailable) {
      this.logger.warn('Elasticsearch không khả dụng. Bỏ qua đồng bộ dữ liệu tài liệu.');
      return;
    }

    try {
      this.logger.log('Bắt đầu đồng bộ dữ liệu tài liệu với Elasticsearch...');
      
      // Lấy tất cả tài liệu từ database
      const documents = await this.documentsRepository.find({
        relations: ['uploader'],
      });
      
      for (const document of documents) {
        // Đọc nội dung file để index vào Elasticsearch
        let fileContent = '';
        
        try {
          const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
          const filePath = path.join(process.cwd(), uploadDir, document.file_url);
          
          if (fs.existsSync(filePath)) {
            fileContent = await this.extractTextFromFile(filePath);
          }
        } catch (error) {
          this.logger.error(`Lỗi khi đọc nội dung file ${document.file_url}: ${error.message}`);
        }
        
        // Chuẩn bị dữ liệu cho Elasticsearch
        const esDocument = {
          document_id: document.document_id,
          title: document.title,
          category: document.category,
          file_url: document.file_url,
          uploaded_by: document.uploaded_by,
          uploaded_at: document.uploaded_at,
          file_content: fileContent,
          uploader_name: document.uploader ? document.uploader.full_name : 'Unknown User',
        };
        
        // Index vào Elasticsearch
        await this.elasticsearchService.indexDocument(esDocument);
      }
      
      this.logger.log(`Đã đồng bộ ${documents.length} tài liệu vào Elasticsearch`);
    } catch (error) {
      this.logger.error(`Lỗi khi đồng bộ dữ liệu tài liệu: ${error.message}`);
    }
  }

  private async extractTextFromFile(filePath: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();
    
    try {
      switch (extension) {
        case '.pdf':
          const pdfData = await fs.promises.readFile(filePath);
          const pdfContent = await pdf(pdfData);
          return pdfContent.text;
          
        case '.docx':
          return new Promise((resolve, reject) => {
            docx.parseDocx(filePath, (err, text) => {
              if (err) {
                reject(err);
              } else {
                resolve(text);
              }
            });
          });
          
        case '.txt':
          return fs.promises.readFile(filePath, 'utf8');
          
        default:
          // Sử dụng textract cho các định dạng khác
          return new Promise((resolve, reject) => {
            textract.fromFileWithPath(filePath, (err, text) => {
              if (err) {
                reject(err);
              } else {
                resolve(text);
              }
            });
          });
      }
    } catch (error) {
      this.logger.error(`Lỗi khi trích xuất văn bản từ file ${filePath}: ${error.message}`);
      return '';
    }
  }

  async findAll(): Promise<Document[]> {
    try {
      const documents = await this.documentsRepository.find({
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
      
      return documents;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy tất cả tài liệu: ${error.message}`);
      return [];
    }
  }

  async findByCategory(category: string): Promise<Document[]> {
    try {
      return this.documentsRepository.find({
        where: { category },
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi lấy tài liệu theo danh mục ${category}: ${error.message}`);
      return [];
    }
  }

  async findOne(id: number): Promise<Document> {
    try {
      const document = await this.documentsRepository.findOne({
        where: { document_id: id },
        relations: ['uploader'],
      });
      
      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }
      
      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi lấy tài liệu ${id}: ${error.message}`);
      throw new NotFoundException(`Error fetching document ${id}`);
    }
  }

  async findTemplates(): Promise<Document[]> {
    try {
      return this.documentsRepository.find({
        where: { category: 'Template' },
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Lỗi khi lấy mẫu tài liệu: ${error.message}`);
      return [];
    }
  }

  async generateFromTemplate(
    templateId: number,
    generateDto: GenerateDocumentDto,
    userId: number
  ): Promise<Document> {
    try {
      // Tìm template
      const template = await this.findOne(templateId);
      
      // Kiểm tra xem có phải là template không
      if (template.category !== 'Template') {
        throw new BadRequestException('Tài liệu này không phải là mẫu');
      }
      
      // Tạo tên tài liệu mới
      const newTitle = generateDto.title || `${template.title} - Generated ${new Date().toLocaleString()}`;
      
      // Tạo tài liệu mới từ template
      const newDocument = this.documentsRepository.create({
        title: newTitle,
        file_url: template.file_url, // Cùng sử dụng file như template
        category: generateDto.category || 'Generated',
        uploaded_by: userId,
        uploaded_at: new Date(),
      });
      
      const savedDocument = await this.documentsRepository.save(newDocument);
      
      // Nếu Elasticsearch khả dụng, index document
      if (this.isElasticsearchAvailable) {
        try {
          // Đọc nội dung file để index vào Elasticsearch
          let fileContent = '';
          
          try {
            const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
            const filePath = path.join(process.cwd(), uploadDir, savedDocument.file_url);
            
            if (fs.existsSync(filePath)) {
              fileContent = await this.extractTextFromFile(filePath);
            }
          } catch (error) {
            this.logger.error(`Lỗi khi đọc nội dung file ${savedDocument.file_url}: ${error.message}`);
          }
          
          // Load user information
          const documentWithUser = await this.documentsRepository.findOne({
            where: { document_id: savedDocument.document_id },
            relations: ['uploader'],
          });
          
          const esDocument = {
            document_id: savedDocument.document_id,
            title: savedDocument.title,
            category: savedDocument.category,
            file_url: savedDocument.file_url,
            uploaded_by: savedDocument.uploaded_by,
            uploaded_at: savedDocument.uploaded_at,
            file_content: fileContent,
            uploader_name: documentWithUser.uploader ? documentWithUser.uploader.full_name : 'Unknown User',
          };
          
          await this.elasticsearchService.indexDocument(esDocument);
        } catch (error) {
          this.logger.error(`Lỗi khi index tài liệu vào Elasticsearch: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi tạo tài liệu từ mẫu: ${error.message}`);
      throw error;
    }
  }

  async create(createDocumentDto: CreateDocumentDto, file: Express.Multer.File): Promise<Document> {
    try {
      // Save file to disk
      const filePath = await this.fileUploadService.saveFile(file, 'documents');
      
      // Create document record
      const document = this.documentsRepository.create({
        title: createDocumentDto.title,
        file_url: filePath,
        category: createDocumentDto.category,
        uploaded_by: createDocumentDto.uploadedBy,
        uploaded_at: new Date(),
      });
      
      const savedDocument = await this.documentsRepository.save(document);
      
      // Nếu Elasticsearch khả dụng, index document
      if (this.isElasticsearchAvailable) {
        try {
          // Đọc nội dung file để index vào Elasticsearch
          let fileContent = '';
          
          try {
            const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
            const fullFilePath = path.join(process.cwd(), uploadDir, filePath);
            
            if (fs.existsSync(fullFilePath)) {
              fileContent = await this.extractTextFromFile(fullFilePath);
            }
          } catch (error) {
            this.logger.error(`Lỗi khi đọc nội dung file ${filePath}: ${error.message}`);
          }
          
          // Load user information
          const documentWithUser = await this.documentsRepository.findOne({
            where: { document_id: savedDocument.document_id },
            relations: ['uploader'],
          });
          
          const esDocument = {
            document_id: savedDocument.document_id,
            title: savedDocument.title,
            category: savedDocument.category,
            file_url: savedDocument.file_url,
            uploaded_by: savedDocument.uploaded_by,
            uploaded_at: savedDocument.uploaded_at,
            file_content: fileContent,
            uploader_name: documentWithUser.uploader ? documentWithUser.uploader.full_name : 'Unknown User',
          };
          
          await this.elasticsearchService.indexDocument(esDocument);
        } catch (error) {
          this.logger.error(`Lỗi khi index tài liệu vào Elasticsearch: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      this.logger.error(`Lỗi khi tạo tài liệu: ${error.message}`);
      throw error;
    }
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    try {
      const document = await this.findOne(id);
      
      // Update document
      const updatedDocument = {
        ...document,
        title: updateDocumentDto.title || document.title,
        category: updateDocumentDto.category || document.category,
      };
      
      const savedDocument = await this.documentsRepository.save(updatedDocument);
      
      // Nếu Elasticsearch khả dụng, update document
      if (this.isElasticsearchAvailable) {
        try {
          const esDocument = {
            document_id: savedDocument.document_id,
            title: savedDocument.title,
            category: savedDocument.category,
          };
          
          await this.elasticsearchService.updateDocument(esDocument);
        } catch (error) {
          this.logger.error(`Lỗi khi update tài liệu trong Elasticsearch: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi cập nhật tài liệu ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const document = await this.findOne(id);
      
      // Remove file from disk
      try {
        await this.fileUploadService.removeFile(document.file_url);
      } catch (error) {
        this.logger.error(`Lỗi khi xóa file ${document.file_url}: ${error.message}`);
      }
      
      // Remove document record
      await this.documentsRepository.remove(document);
      
      // Nếu Elasticsearch khả dụng, delete document
      if (this.isElasticsearchAvailable) {
        try {
          await this.elasticsearchService.deleteDocument(id);
        } catch (error) {
          this.logger.error(`Lỗi khi xóa tài liệu khỏi Elasticsearch: ${error.message}`);
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Lỗi khi xóa tài liệu ${id}: ${error.message}`);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const result = await this.documentsRepository
        .createQueryBuilder('document')
        .select('DISTINCT document.category', 'category')
        .getRawMany();
      
      return result.map(item => item.category);
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách danh mục: ${error.message}`);
      return [];
    }
  }

  // Phương thức tìm kiếm tài liệu với Elasticsearch
  async searchDocuments(query: string, category?: string, page: number = 1, size: number = 10): Promise<any> {
    if (!this.isElasticsearchAvailable) {
      // Fallback to regular search if Elasticsearch is not available
      try {
        let queryBuilder = this.documentsRepository.createQueryBuilder('document')
          .leftJoinAndSelect('document.uploader', 'uploader')
          .where('document.title ILIKE :query', { query: `%${query}%` });
        
        if (category) {
          queryBuilder = queryBuilder.andWhere('document.category = :category', { category });
        }
        
        const [documents, total] = await queryBuilder
          .orderBy('document.uploaded_at', 'DESC')
          .skip((page - 1) * size)
          .take(size)
          .getManyAndCount();
        
        return {
          results: documents,
          pagination: {
            total,
            page,
            size,
            pages: Math.ceil(total / size),
          },
        };
      } catch (error) {
        this.logger.error(`Lỗi khi tìm kiếm tài liệu: ${error.message}`);
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
    
    // Use Elasticsearch
    return this.elasticsearchService.searchDocuments(query, category, page, size);
  }
}