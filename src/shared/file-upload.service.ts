// src/shared/file-upload.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  constructor(private configService: ConfigService) {}

  async saveFile(file: Express.Multer.File, folder: string): Promise<string> {
    const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    const folderPath = path.join(uploadDir, folder);
    
    // Ensure the directory exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Generate unique filename
    const filename = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(folderPath, filename);
    
    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);
    
    // Return the file path relative to the upload dir
    return path.join(folder, filename);
  }

  async removeFile(filePath: string): Promise<void> {
    const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    const fullPath = path.join(uploadDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}