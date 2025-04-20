// src/notifications/notifications.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('NotificationsGateway');
  private userSockets: Map<number, string[]> = new Map();

  handleConnection(client: Socket): void {
    const userId = client.handshake.query.userId;
    this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
    
    if (userId) {
      const userIdNum = Number(userId);
      const existingSockets = this.userSockets.get(userIdNum) || [];
      this.userSockets.set(userIdNum, [...existingSockets, client.id]);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove socket from userSockets map
    this.userSockets.forEach((sockets, userId) => {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, sockets);
        }
      }
    });
  }

  sendNotificationToUser(userId: number, notification: any): void {
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds && userSocketIds.length > 0) {
      userSocketIds.forEach(socketId => {
        this.server.to(socketId).emit('notification', notification);
      });
      this.logger.log(`Notification sent to user ${userId}`);
    }
  }
}