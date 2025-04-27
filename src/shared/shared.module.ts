// src/shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { ConfigModule } from '@nestjs/config';
import { WebSocketClient } from './websocket.client';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FileUploadService, WebSocketClient],
  exports: [FileUploadService, WebSocketClient],
})
export class SharedModule {}