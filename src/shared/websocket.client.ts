// src/shared/websocket.client.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class WebSocketClient {
  constructor(private notificationsGateway: NotificationsGateway) {}

  getServer(): Server {
    return this.notificationsGateway.server;
  }

  broadcastToAll(event: string, data: any): void {
    this.notificationsGateway.server.emit(event, data);
  }

  sendToUser(userId: number, event: string, data: any): void {
    this.notificationsGateway.server.to(`user-${userId}`).emit(event, data);
  }
}