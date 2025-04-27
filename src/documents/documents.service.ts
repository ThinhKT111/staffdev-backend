// src/documents/documents.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FileUploadService } from '../shared/file-upload.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private fileUploadService: FileUploadService,
  ) {}

  async findAll(): Promise<Document[]> {
    return this.documentsRepository.find({
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
    });
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
    
    return this.documentsRepository.save(newDocument);
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
    
    return this.documentsRepository.save(document);
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id);
    
    // Update document
    const updatedDocument = {
      ...document,
      title: updateDocumentDto.title || document.title,
      category: updateDocumentDto.category || document.category,
    };
    
    return this.documentsRepository.save(updatedDocument);
  }

  async remove(id: number): Promise<void> {
    const document = await this.findOne(id);
    
    // Remove file from disk
    await this.fileUploadService.removeFile(document.file_url);
    
    // Remove document record
    await this.documentsRepository.remove(document);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.documentsRepository
      .createQueryBuilder('document')
      .select('DISTINCT document.category', 'category')
      .getRawMany();
    
    return result.map(item => item.category);
  }
}