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
import { WebSocketRateLimiter } from '../shared/websocket-rate-limit';
import { WebSocketClient } from '../shared/websocket.client';
import { OnlineUsersService } from '../shared/services/online-users.service';
import { UnreadCounterService } from './services/unread-counter.service';
import { NotificationEvents } from './dto/notification-event.dto';
import { WebSocketMessageDto } from './dto/websocket-message.dto';

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
    private webSocketClient: WebSocketClient,
    private onlineUsersService: OnlineUsersService,
    private unreadCounterService: UnreadCounterService
  ) {}

  afterInit(server: Server): void {
    this.webSocketClient.setServer(server);
    this.logger.log('WebSocket server initialized and shared with WebSocketClient');
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
      
      // Đánh dấu user online
      const onlineCount = await this.onlineUsersService.addOnlineUser(userId);
      
      // Lấy số thông báo chưa đọc
      const unreadCount = await this.unreadCounterService.getCount(userId);
      
      // Phát sự kiện user online
      this.server.emit(NotificationEvents.USER_STATUS_CHANGE, {
        userId,
        status: 'online',
        onlineCount
      });
      
      // Send connection established with initial data
      client.emit(NotificationEvents.CONNECTION_ESTABLISHED, {
        userId,
        onlineCount,
        unreadCount
      });
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    let disconnectedUserId: number | null = null;
    
    // Remove socket from userSockets map
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        disconnectedUserId = userId;
        sockets.splice(index, 1);
        
        if (sockets.length === 0) {
          // Nếu không còn socket nào, đánh dấu user offline
          this.userSockets.delete(userId);
          
          // Đánh dấu user offline
          const onlineCount = await this.onlineUsersService.removeOnlineUser(userId);
          
          // Phát sự kiện user offline
          this.server.emit(NotificationEvents.USER_STATUS_CHANGE, {
            userId,
            status: 'offline',
            onlineCount
          });
        } else {
          this.userSockets.set(userId, sockets);
        }
        
        break;
      }
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
  
  // Helper methods để xử lý events
  private async handleMarkAsRead(userId: number, notificationId: number): Promise<void> {
    // Giảm counter
    const unreadCount = await this.unreadCounterService.decrement(userId);
    
    // Broadcast to all user's connections
    this.server.to(`user-${userId}`).emit(NotificationEvents.NOTIFICATION_READ, { 
      notificationId,
      unreadCount
    });
  }
  
  private async handleMarkAllAsRead(userId: number): Promise<void> {
    // Reset counter
    await this.unreadCounterService.reset(userId);
    
    // Broadcast to all user's connections
    this.server.to(`user-${userId}`).emit(NotificationEvents.ALL_NOTIFICATIONS_READ, { 
      unreadCount: 0 
    });
  }
  
  private async handleGetNotifications(userId: number, client: Socket): Promise<void> {
    const unreadCount = await this.unreadCounterService.getCount(userId);
    
    client.emit('unread_count', { 
      userId,
      unreadCount
    });
  }
}