// src/notifications/notifications.gateway.ts
import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationType } from '../entities/notification.entity';
import { NotificationEvents } from './dto/notification-event.dto';
import { WebSocketMessageDto } from './dto/websocket-message.dto';
import { WebSocketRateLimiter } from '../shared/websocket-rate-limit';
import { WebSocketClient } from '../shared/websocket.client';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  private logger = new Logger('NotificationsGateway');
  private userSockets: Map<number, string[]> = new Map();

  constructor(
    private jwtService: JwtService,
    private rateLimiter: WebSocketRateLimiter,
    private webSocketClient: WebSocketClient
  ) {}

  afterInit(server: Server): void {
    this.webSocketClient.setServer(server);
    this.logger.log('WebSocket server initialized and shared with WebSocketClient');
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

  broadcastNotification(notification: any): void {
    this.server.emit('broadcast', notification);
    this.logger.log('Broadcast notification sent to all connected clients');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client without token tried to connect: ${client.id}`);
        client.disconnect();
        return;
      }
  
      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
      
      // Store socket connection
      const existingSockets = this.userSockets.get(userId) || [];
      this.userSockets.set(userId, [...existingSockets, client.id]);
      
      // Join room based on userId
      client.join(`user-${userId}`);
      
      // Send connection established with initial data
      this.server.to(client.id).emit(NotificationEvents.CONNECTION_ESTABLISHED, {
        userId
      });
      
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.disconnect();
    }
  }
  
  // Khi nhận event từ client
  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() message: WebSocketMessageDto,
    @ConnectedSocket() client: Socket
  ): void {
    // Check rate limit
    if (this.rateLimiter.isRateLimited(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      // Xử lý dựa trên event
      switch (message.event) {
        case 'mark_as_read':
          this.handleMarkAsRead(userId, message.data.notificationId);
          break;
        case 'mark_all_as_read':
          this.handleMarkAllAsRead(userId);
          break;
        case 'get_notifications':
          this.handleGetNotifications(userId, client);
          break;
        default:
          this.logger.warn(`Unknown event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
    }
  }
  
  // Các phương thức xử lý event
  private async handleMarkAsRead(userId: number, notificationId: number): Promise<void> {
    // Broadcast to all user's connections
    this.server.to(`user-${userId}`).emit(NotificationEvents.NOTIFICATION_READ, { 
      notificationId
    });
  }
  
  private async handleMarkAllAsRead(userId: number): Promise<void> {
    // Broadcast to all user's connections
    this.server.to(`user-${userId}`).emit(NotificationEvents.ALL_NOTIFICATIONS_READ, { 
      unreadCount: 0 
    });
  }
  
  private async handleGetNotifications(userId: number, client: Socket): Promise<void> {
    client.emit('notifications', { userId });
  }
  
  // Cập nhật phương thức gửi thông báo
  sendNotificationToUser(userId: number, notification: any): void {
    // Send to specific user's room
    this.server.to(`user-${userId}`).emit(NotificationEvents.NEW_NOTIFICATION, notification);
    
    this.logger.log(`Notification sent to user ${userId}`);
  }
}