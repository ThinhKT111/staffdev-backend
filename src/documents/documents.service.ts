// src/documents/documents.service.ts
import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FileUploadService } from '../shared/file-upload.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private fileUploadService: FileUploadService,
    private elasticsearchService: ElasticsearchService
  ) {}

  async findAll(): Promise<Document[]> {
    try {
      return await this.documentsRepository.find({
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching all documents: ${error.message}`);
      return [];
    }
  }

  async findByCategory(category: string): Promise<Document[]> {
    try {
      // Check if Elasticsearch is available for enhanced search
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          const esResult = await this.elasticsearchService.searchDocuments(`category:${category}`);
          if (esResult.hits.length > 0) {
            // Get document IDs from Elasticsearch
            const docIds = esResult.hits.map(hit => hit.document_id);
            
            // Fetch complete documents from database
            return await this.documentsRepository.find({
              where: { document_id: In(documentIds) },
              relations: ['uploader'],
              order: { uploaded_at: 'DESC' },
            });
          }
        } catch (error) {
          this.logger.error(`Elasticsearch search failed, falling back to database: ${error.message}`);
        }
      }
      
      // Fallback to database search
      return await this.documentsRepository.find({
        where: { category },
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching documents by category: ${error.message}`);
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
      this.logger.error(`Error fetching document ${id}: ${error.message}`);
      throw new NotFoundException(`Error fetching document ${id}`);
    }
  }

  async findTemplates(): Promise<Document[]> {
    try {
      return await this.documentsRepository.find({
        where: { category: 'Template' },
        relations: ['uploader'],
        order: { uploaded_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching templates: ${error.message}`);
      return [];
    }
  }

  async generateFromTemplate(
    templateId: number,
    generateDto: GenerateDocumentDto,
    userId: number
  ): Promise<Document> {
    try {
      // Find template
      const template = await this.findOne(templateId);
      
      // Check if it's a template
      if (template.category !== 'Template') {
        throw new BadRequestException('This document is not a template');
      }
      
      // Create new document name
      const newTitle = generateDto.title || `${template.title} - Generated ${new Date().toLocaleString()}`;
      
      // Create new document from template
      const newDocument = this.documentsRepository.create({
        title: newTitle,
        file_url: template.file_url, // Use same file as template
        category: generateDto.category || 'Generated',
        uploaded_by: userId,
        uploaded_at: new Date(),
      });
      
      const savedDocument = await this.documentsRepository.save(newDocument);
      
      // Index in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          // Try to read file content for indexing
          const uploadDir = process.env.UPLOAD_DIR || 'uploads';
          const filePath = path.join(process.cwd(), uploadDir, template.file_url);
          
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            await this.elasticsearchService.indexDocument(savedDocument, fileContent);
          } else {
            await this.elasticsearchService.indexDocument(savedDocument);
          }
        } catch (error) {
          this.logger.error(`Error indexing generated document: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error generating document from template: ${error.message}`);
      throw new BadRequestException('Error generating document from template');
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
      
      // Index in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          // Try to extract text for indexing
          let fileContent = '';
          
          // Basic text extraction based on file type
          if (file.mimetype.includes('text/')) {
            fileContent = file.buffer.toString('utf8');
          }
          
          await this.elasticsearchService.indexDocument(savedDocument, fileContent);
        } catch (error) {
          this.logger.error(`Error indexing document: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      this.logger.error(`Error creating document: ${error.message}`);
      throw new BadRequestException('Error creating document');
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
      
      // Update in Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.indexDocument(savedDocument);
        } catch (error) {
          this.logger.error(`Error updating document in Elasticsearch: ${error.message}`);
        }
      }
      
      return savedDocument;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating document ${id}: ${error.message}`);
      throw new BadRequestException('Error updating document');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const document = await this.findOne(id);
      
      // Remove file from disk
      await this.fileUploadService.removeFile(document.file_url);
      
      // Remove document record
      await this.documentsRepository.remove(document);
      
      // Remove from Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          await this.elasticsearchService.removeDocumentFromIndex(id);
        } catch (error) {
          this.logger.error(`Error removing document from Elasticsearch: ${error.message}`);
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error removing document ${id}: ${error.message}`);
      throw new BadRequestException('Error removing document');
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
      this.logger.error(`Error fetching categories: ${error.message}`);
      return [];
    }
  }
  
  async searchDocuments(query: string): Promise<Document[]> {
    try {
      // Use Elasticsearch if available
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        try {
          const searchResults = await this.elasticsearchService.searchDocuments(query);
          
          if (searchResults.hits.length > 0) {
            // Get document IDs from search results
            const documentIds = searchResults.hits.map(hit => hit.document_id);
            
            // Fetch complete document records from database
            const documents = await this.documentsRepository.find({
              where: { document_id: In(documentIds) },
              relations: ['uploader'],
            });
            
            // Sort documents based on Elasticsearch score order
            return documentIds.map(id => documents.find(doc => doc.document_id === id))
              .filter(doc => doc !== undefined) as Document[];
          }
        } catch (error) {
          this.logger.error(`Elasticsearch search failed, falling back to database: ${error.message}`);
        }
      }
      
      // Fallback to database search
      return await this.documentsRepository
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.uploader', 'uploader')
        .where('document.title ILIKE :query OR document.category ILIKE :query', {
          query: `%${query}%`
        })
        .orderBy('document.uploaded_at', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      return [];
    }
  }
}