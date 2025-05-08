// src/documents/documents.service.ts
import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FileUploadService } from '../shared/file-upload.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

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
    const documents = await this.documentsRepository.find({
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
    });
    
    return documents;
  }

  async searchDocuments(query: string, category?: string): Promise<Document[]> {
    try {
      if (this.elasticsearchService.getElasticsearchAvailability()) {
        // Search using Elasticsearch
        const searchResult = await this.elasticsearchService.searchDocuments(query, category);
        
        if (searchResult.results.length > 0) {
          // Get IDs from search results
          const documentIds = searchResult.results.map(doc => parseInt(doc.document_id));
          
          // Get full documents from database
          const documents = await this.documentsRepository.find({
            where: { document_id: In(documentIds) },
            relations: ['uploader'],
          });
          
          // Sort by search result order
          return documentIds.map(id => 
            documents.find(doc => doc.document_id === id)
          ).filter(Boolean);
        }
      }
      
      // Fallback: Simple database search
      let queryBuilder = this.documentsRepository.createQueryBuilder('document')
        .leftJoinAndSelect('document.uploader', 'uploader')
        .where('document.title ILIKE :query', { query: `%${query}%` });
      
      if (category) {
        queryBuilder = queryBuilder.andWhere('document.category = :category', { category });
      }
      
      return queryBuilder
        .orderBy('document.uploaded_at', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      return [];
    }
  }

  async findByCategory(category: string): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { category },
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { document_id: id },
      relations: ['uploader'],
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    
    return document;
  }

  async findTemplates(): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { category: 'Template' },
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
    });
  }

  async generateFromTemplate(
    templateId: number,
    generateDto: GenerateDocumentDto,
    userId: number
  ): Promise<Document> {
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
    
    // Index document vào Elasticsearch
    if (this.elasticsearchService.getElasticsearchAvailability()) {
      await this.indexDocumentContent(savedDocument);
    }
    
    return savedDocument;
  }

  async create(createDocumentDto: CreateDocumentDto, file: Express.Multer.File): Promise<Document> {
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
    
    // Extract and index document content if Elasticsearch is available
    if (this.elasticsearchService.getElasticsearchAvailability()) {
      await this.indexDocumentContent(savedDocument, file);
    }
    
    return savedDocument;
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id);
    
    // Update document
    const updatedDocument = {
      ...document,
      title: updateDocumentDto.title || document.title,
      category: updateDocumentDto.category || document.category,
    };
    
    const savedDocument = await this.documentsRepository.save(updatedDocument);
    
    // Update document in Elasticsearch
    if (this.elasticsearchService.getElasticsearchAvailability()) {
      await this.indexDocumentContent(savedDocument);
    }
    
    return savedDocument;
  }

  async remove(id: number): Promise<void> {
    const document = await this.findOne(id);
    
    // Remove file from disk
    await this.fileUploadService.removeFile(document.file_url);
    
    // Remove document from Elasticsearch
    if (this.elasticsearchService.getElasticsearchAvailability()) {
      await this.elasticsearchService.removeDocumentFromIndex(document.document_id);
    }
    
    // Remove document record
    await this.documentsRepository.remove(document);
  }

  async getCategories(): Promise<string[]> {
    // Try to get categories from Elasticsearch for better performance
    if (this.elasticsearchService.getElasticsearchAvailability()) {
      const categories = await this.elasticsearchService.getDocumentCategories();
      if (categories.length > 0) {
        return categories;
      }
    }
    
    // Fallback to database
    const result = await this.documentsRepository
      .createQueryBuilder('document')
      .select('DISTINCT document.category', 'category')
      .getRawMany();
    
    return result.map(item => item.category);
  }
  
  // Helper method to extract content from a document file and index it
  private async indexDocumentContent(document: Document, file?: Express.Multer.File): Promise<void> {
    try {
      let fileContent = '';
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      let fileBuffer: Buffer;
      
      if (file) {
        // Use the buffer from the uploaded file
        fileBuffer = file.buffer;
      } else {
        // Read file from disk
        const filePath = path.join(process.cwd(), uploadDir, document.file_url);
        if (!fs.existsSync(filePath)) {
          this.logger.warn(`File not found for document ${document.document_id}: ${filePath}`);
          return;
        }
        fileBuffer = fs.readFileSync(filePath);
      }
      
      const fileExtension = path.extname(document.file_url).toLowerCase();
      
      // Extract text based on file type
      if (fileExtension === '.pdf') {
        const pdfData = await pdfParse(fileBuffer);
        fileContent = pdfData.text;
      } else if (fileExtension === '.docx') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        fileContent = result.value;
      } else if (fileExtension === '.txt') {
        fileContent = fileBuffer.toString('utf8');
      } else {
        // Skip unknown formats
        this.logger.warn(`Unsupported file format for indexing: ${fileExtension}`);
      }
      
      // Index the document with its content
      const documentWithUser = await this.documentsRepository.findOne({
        where: { document_id: document.document_id },
        relations: ['uploader'],
      });
      
      await this.elasticsearchService.indexDocument({
        ...documentWithUser,
        content: fileContent
      });
      
    } catch (error) {
      this.logger.error(`Error indexing document content: ${error.message}`);
    }
  }
}