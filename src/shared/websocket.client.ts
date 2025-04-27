// src/shared/websocket.client.ts
import { Injectable, Inject, Optional } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebSocketClient {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  getServer(): Server | null {
    return this.server;
  }

  broadcastToAll(event: string, data: any): void {
    if (this.server) {
      this.server.emit(event, data);
    } else {
      console.warn('WebSocket server not initialized yet');
    }
  }

  sendToUser(userId: number, event: string, data: any): void {
    if (this.server) {
      this.server.to(`user-${userId}`).emit(event, data);
    } else {
      console.warn('WebSocket server not initialized yet');
    }
  }
}