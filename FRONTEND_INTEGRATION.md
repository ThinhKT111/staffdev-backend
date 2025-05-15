# StaffDev Backend API Integration Guide

## Overview
This document provides comprehensive guidance for integrating an Angular (v19.2.6) frontend with the StaffDev Backend API.

## Table of Contents
1. [API Basics](#api-basics)
2. [Authentication](#authentication)
3. [Real-time Communication](#real-time-communication)
4. [Core Services](#core-services)
5. [File Uploads and Downloads](#file-uploads-and-downloads)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Performance Considerations](#performance-considerations)

## API Basics

### Base URL and Configuration
- **Base URL**: `http://localhost:3000/api`
- **API Documentation**: `http://localhost:3000/api` (Swagger)
- **Content-Type**: `application/json`

### Standard Response Format
All API endpoints return responses in this consistent format:

```json
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### Pagination
Endpoints that return lists support pagination with the following query parameters:
- `page`: Page number (starts at 1)
- `limit`: Records per page
- `sort`: Field to sort by
- `order`: Sort direction (`asc` or `desc`)

Example: `/api/users?page=2&limit=20&sort=createdAt&order=desc`

## Authentication

### Authentication Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/auth/login` | POST | User login | `{ email, password }` | `{ token, refreshToken, user }` |
| `/auth/register` | POST | User registration | `{ cccd, email, password, phone, fullName, role }` | `{ token, refreshToken, user }` |
| `/auth/forgot-password` | POST | Password recovery | `{ email }` | `{ success, message }` |
| `/auth/reset-password` | POST | Reset password | `{ token, newPassword }` | `{ success }` |
| `/auth/change-password` | PATCH | Change password | `{ currentPassword, newPassword }` | `{ success }` |
| `/auth/logout` | POST | Logout | `{ refreshToken }` | `{ success }` |

### JWT Authentication
The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Integration Example

```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials)
      .pipe(tap(response => this.handleAuth(response)));
  }

  private handleAuth(response: any): void {
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      this.currentUserSubject.next(response.user);
    }
  }

  // Additional auth methods...
}
```

## Real-time Communication

The backend uses WebSockets (Socket.io) for real-time features.

### WebSocket Connection

```typescript
// websocket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor(private authService: AuthService) {}

  connect(): void {
    this.socket = io(`${environment.socketUrl}/notifications`, {
      path: '/notifications/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  }

  subscribe(event: string, callback: Function): void {
    this.socket.on(event, callback);
  }

  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }
}
```

### Notification Events
Key notification events:

| Event | Description | Payload |
|-------|-------------|---------|
| `notification` | New notification | `{ id, title, content, type, createdAt }` |
| `notification_read` | Notification marked as read | `{ notificationId, unreadCount }` |
| `all_notifications_read` | All notifications marked as read | `{ unreadCount: 0 }` |
| `unread_count` | Unread notifications count | `{ userId, unreadCount }` |

## Core Services

### Users API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/users` | GET | List users | Query: `page`, `limit`, `search`, `role`, `departmentId` |
| `/users/:id` | GET | Get user details | - |
| `/users` | POST | Create user | Body: User details |
| `/users/:id` | PATCH | Update user | Body: Updated fields |
| `/users/:id` | DELETE | Delete user | - |

### Departments API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/departments` | GET | List departments | Query: `page`, `limit`, `search` |
| `/departments/:id` | GET | Get department details | - |
| `/departments` | POST | Create department | Body: Department details |
| `/departments/:id` | PATCH | Update department | Body: Updated fields |
| `/departments/:id` | DELETE | Delete department | - |

### Training API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/training/paths` | GET | List training paths | Query: `page`, `limit`, `search` |
| `/training/paths/:id` | GET | Get path details | - |
| `/training/courses` | GET | List courses | Query: `page`, `limit`, `search` |
| `/training/courses/:id` | GET | Get course details | - |

### Tasks API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/tasks` | GET | List tasks | Query: `page`, `limit`, `search`, `status` |
| `/tasks/:id` | GET | Get task details | - |
| `/tasks` | POST | Create task | Body: Task details |
| `/tasks/:id/status` | PATCH | Update task status | Body: `{ status }` |
| `/tasks/:id/feedback` | POST | Add feedback | Body: `{ feedback, score }` |

### Forum API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/forum/posts` | GET | List posts | Query: `page`, `limit`, `search` |
| `/forum/posts/:id` | GET | Get post details | - |
| `/forum/posts/:id/comments` | GET | Get post comments | Query: `page`, `limit` |
| `/forum/comments` | POST | Add comment | Body: Comment details |

### Notifications API

| Endpoint | Method | Description | Request Body/Query Params |
|----------|--------|-------------|---------------------------|
| `/notifications` | GET | List notifications | Query: `page`, `limit`, `read` |
| `/notifications/unread` | GET | Get unread count | - |
| `/notifications/:id/read` | PATCH | Mark as read | - |
| `/notifications/user/:userId/mark-all-read` | POST | Mark all as read | - |

## File Uploads and Downloads

### Document Uploads

```typescript
// Angular file upload example
uploadDocument(file: File, metadata: any): Observable<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));
  
  return this.http.post(`${environment.apiUrl}/documents`, formData);
}
```

### Document Downloads

```typescript
// Angular file download example
downloadDocument(documentId: number): void {
  window.location.href = `${environment.apiUrl}/documents/${documentId}/download`;
}
```

## Error Handling

The backend returns detailed error responses that should be handled in the frontend:

```typescript
// HTTP interceptor for handling errors
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toastr: ToastrService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        // Handle specific error codes
        if (error.status === 401) {
          // Unauthorized - redirect to login
        } else if (error.status === 403) {
          // Forbidden - show permission message
        } else if (error.status === 429) {
          // Rate limited
          errorMessage = 'Too many requests, please try again later';
        }
        
        this.toastr.error(errorMessage);
        return throwError(() => error);
      })
    );
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Consider handling 429 responses:

- Regular endpoints: 60 requests per minute per IP
- Login/Registration: 5 requests per minute
- Implement retry with exponential backoff for rate-limited requests

## Performance Considerations

1. **Pagination**: Always use pagination for list endpoints
2. **Caching**: Implement client-side caching for rarely changing data
3. **Optimistic Updates**: Use optimistic UI updates for better UX

```typescript
// Example of pagination and caching
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private cache = new Map<string, { data: any, timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(private http: HttpClient) {}
  
  getUsers(page = 1, limit = 20): Observable<any> {
    const cacheKey = `users_${page}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return of(cached.data);
    }
    
    return this.http.get(`${this.apiUrl}?page=${page}&limit=${limit}`)
      .pipe(
        tap(response => {
          this.cache.set(cacheKey, { 
            data: response, 
            timestamp: Date.now() 
          });
        })
      );
  }
}
```

This guide provides the essential information needed to implement a frontend that integrates smoothly with the StaffDev backend API. For detailed API documentation, refer to the Swagger documentation at `http://localhost:3000/api`. 