// src/documents/documents.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import * as path from 'path';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private configService: ConfigService,
  ) {}

  @Get()
  findAll(@Query('category') category?: string) {
    if (category) {
      return this.documentsService.findByCategory(category);
    }
    
    return this.documentsService.findAll();
  }

  @Get('categories')
  getCategories() {
    return this.documentsService.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(+id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const document = await this.documentsService.findOne(+id);
    const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    const filePath = path.join(process.cwd(), uploadDir, document.file_url);
    
    const file = createReadStream(filePath);
    const fileName = path.basename(document.file_url);
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    
    return new StreamableFile(file);
  }

  @Get('templates')
  findTemplates() {
    return this.documentsService.findTemplates();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.create(createDocumentDto, file);
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  @UseInterceptors(FileInterceptor('file'))
  createTemplate(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!createDocumentDto.uploadedBy) {
      createDocumentDto.uploadedBy = req.user.userId;
    }
    createDocumentDto.category = 'Template';
    return this.documentsService.create(createDocumentDto, file);
  }

  @Post('generate/:templateId')
  @UseInterceptors(FileInterceptor('file'))
  generateFromTemplate(
    @Param('templateId') templateId: string,
    @Body() generateDto: GenerateDocumentDto,
    @Request() req
  ) {
    return this.documentsService.generateFromTemplate(
      +templateId,
      generateDto,
      req.user.userId
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(+id, updateDocumentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  remove(@Param('id') id: string) {
    return this.documentsService.remove(+id);
  }
}