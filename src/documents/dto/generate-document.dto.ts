// src/documents/dto/generate-document.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class GenerateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;
}