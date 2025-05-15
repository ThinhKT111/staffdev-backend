# StaffDev Backend - Hướng dẫn phát triển

Backend NestJS cho ứng dụng phát triển nhân viên (StaffDev), bao gồm hệ thống quản lý khóa học, tác vụ, diễn đàn, thông báo và tài liệu với khả năng tìm kiếm mạnh mẽ.

## Mục lục

1. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
2. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
3. [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
4. [API Documentation](#api-documentation)
5. [Kiểm thử](#kiểm-thử)
6. [Redis và WebSocket](#redis-và-websocket)
7. [Elasticsearch](#elasticsearch)
8. [Quản lý cấu hình](#quản-lý-cấu-hình)
9. [Triển khai](#triển-khai)
10. [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

## Kiến trúc hệ thống

StaffDev là ứng dụng quản lý phát triển nhân viên toàn diện được xây dựng theo kiến trúc module hóa:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│                         NestJS Backend                           │
│  ┌─────────────┐  ┌───────────┴────────────┐  ┌──────────────┐  │
│  │  Auth/Users │  │  Business Logic Modules │  │  Common Utils │  │
│  └─────────────┘  └────────────────────────┘  └──────────────┘  │
└──────┬─────────────────────┬──────────────────────┬─────────────┘
       │                     │                      │
┌──────┴──────────┐  ┌──────┴──────────┐   ┌───────┴────────┐
│  PostgreSQL DB  │  │  Redis Cache    │   │  Elasticsearch │
└─────────────────┘  └─────────────────┘   └────────────────┘
```

### Module cấu trúc:

- **Core modules**: Auth, Users, Profiles
- **Organization modules**: Departments, Training
- **Task management**: Tasks, Assignments, Attendance
- **Content modules**: Forum, Documents
- **Integration modules**: Notifications, Dashboard, Search

## Công nghệ sử dụng

### 1. NestJS v9.0

**Vai trò**: Framework backend chính
- **Routing và Controllers**: REST API, Validation
- **Dependency Injection**: Services, Providers
- **Guards & Interceptors**: Authentication, Error handling, Response transformation
- **WebSockets**: Real-time notifications
- **Scheduled Tasks**: Cron jobs, Background tasks

**Cấu trúc thư mục**:
- `src/app.module.ts`: Module gốc chứa tất cả module con
- `src/main.ts`: Entry point của ứng dụng
- `src/auth`: Module authentication
- `src/users`: Module quản lý người dùng
- `src/forum`: Module diễn đàn và bình luận
- `src/tasks`: Module nhiệm vụ và công việc
- `src/notifications`: Module thông báo và WebSocket
- `src/documents`: Module quản lý tài liệu
- `src/training`: Module quản lý khóa học và lộ trình
- `src/common`: Các tiện ích dùng chung
- `src/entities`: Định nghĩa entity cho database

### 2. PostgreSQL v16

**Vai trò**: Database chính
- Lưu trữ dữ liệu người dùng, phòng ban, khóa học, nhiệm vụ, diễn đàn, tài liệu
- Đảm bảo tính toàn vẹn dữ liệu thông qua foreign key constraints

**Cấu trúc database**:
- Hệ thống gồm 15+ bảng có quan hệ với nhau
- Foreign key đảm bảo tính toàn vẹn dữ liệu
- Index cho việc tìm kiếm hiệu quả

### 3. Redis v7.0

**Vai trò**: Memory cache và real-time messaging
- **Cache**: Tối ưu hiệu suất cho các truy vấn phức tạp
- **Rate Limiting**: Bảo vệ API khỏi overload
- **WebSocket Pub/Sub**: Messaging cho real-time features
- **Session management**: JWT blacklist
- **Counters**: Comment counts, notification counts, online users

**Triển khai**:
- `src/common/services/redis.service.ts`: Service quản lý kết nối Redis
- `src/shared/services/queue.service.ts`: Quản lý hàng đợi sử dụng Redis
- `src/common/services/rate-limiter.service.ts`: Giới hạn tốc độ truy cập API

### 4. Elasticsearch v9.0

**Vai trò**: Full-text search
- Tìm kiếm nhanh và chính xác với full-text search
- Đánh chỉ mục cho forum posts, documents, và tasks
- Vietnamese analyzer cho tìm kiếm tiếng Việt
- Fuzzy search và suggestion

**Triển khai**:
- `src/elasticsearch`: Module cấu hình và quản lý Elasticsearch
- Tích hợp với các service để đánh chỉ mục dữ liệu tự động

### 5. TypeORM

**Vai trò**: ORM để tương tác với PostgreSQL
- Entity definitions
- Repository pattern
- Migrations và database schema management

**Triển khai**:
- `src/entities`: Các entity class
- `src/database`: Cấu hình và migrations

## Cài đặt và chạy dự án

### Yêu cầu hệ thống

- Node.js >= 18
- PostgreSQL >= 16
- Redis >= 7.0
- Elasticsearch >= 9.0 (tùy chọn, nhưng cần cho search features)

### Các bước cài đặt

1. Clone dự án:
```bash
git clone <repo-url>
cd staffdev-backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file .env (từ .env.example):
```bash
cp .env.example .env
# Sau đó chỉnh sửa các thông số kết nối trong .env
```

4. Chạy development server:
```bash
npm run start:dev
```

### Các lệnh quan trọng

```bash
# Chạy development mode
npm run start:dev

# Chạy production build
npm run build
npm run start:prod

# Chạy tests
npm run test
npm run test:e2e

# Kiểm tra lỗi code style
npm run lint

# Chạy database migrations
npm run migration:run

# Kiểm tra kết nối Redis
node scripts/setup-redis-wsl.js

# Cấu hình Redis trên WSL (nếu cần)
./scripts/fix-redis-wsl.sh

# Cập nhật cấu hình Redis
node update-redis-config.js
```

## API Documentation

API documentation chi tiết có sẵn tại `http://localhost:3000/api` khi ứng dụng đang chạy.

### Định dạng API response chuẩn

Tất cả API endpoints đều trả về dữ liệu theo định dạng:

```json
// Success response
{
  "success": true,
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

### API Endpoints chính

#### Authentication

| Endpoint | Method | Mô tả | Xác thực |
|----------|--------|-------|----------|
| `/auth/login` | POST | Đăng nhập | Không |
| `/auth/register` | POST | Đăng ký | Không |
| `/auth/forgot-password` | POST | Quên mật khẩu | Không |
| `/auth/reset-password` | POST | Đặt lại mật khẩu | Không |
| `/auth/change-password` | PATCH | Đổi mật khẩu | JWT |
| `/auth/login-with-device` | POST | Đăng nhập qua thiết bị | Không |
| `/auth/logout` | POST | Đăng xuất | JWT |

#### Users & Profiles

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/users` | GET | Danh sách users | JWT | Admin |
| `/users/:id` | GET | Chi tiết user | JWT | Admin/Self |
| `/users` | POST | Tạo user mới | JWT | Admin |
| `/users/:id` | PATCH | Cập nhật user | JWT | Admin/Self |
| `/users/:id` | DELETE | Xóa user | JWT | Admin |
| `/profiles/me` | GET | Profile cá nhân | JWT | Any |
| `/profiles/me/avatar` | POST | Upload avatar | JWT | Any |
| `/profiles/me/2fa/enable` | POST | Bật xác thực 2 yếu tố | JWT | Any |

#### Departments

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/departments` | GET | Danh sách phòng ban | JWT | Any |
| `/departments/:id` | GET | Chi tiết phòng ban | JWT | Any |
| `/departments` | POST | Tạo phòng ban | JWT | Admin |
| `/departments/:id` | PATCH | Cập nhật phòng ban | JWT | Admin |
| `/departments/:id` | DELETE | Xóa phòng ban | JWT | Admin |

#### Training

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/training/paths` | GET | Danh sách lộ trình | JWT | Any |
| `/training/paths/:id` | GET | Chi tiết lộ trình | JWT | Any |
| `/training/courses` | GET | Danh sách khóa học | JWT | Any |
| `/training/courses/:id` | GET | Chi tiết khóa học | JWT | Any |
| `/user-courses/enroll` | POST | Đăng ký khóa học | JWT | Any |
| `/user-courses/progress/:userId/:courseId` | PATCH | Cập nhật tiến độ | JWT | Any |

#### Tasks

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/tasks` | GET | Danh sách nhiệm vụ | JWT | Any |
| `/tasks/:id` | GET | Chi tiết nhiệm vụ | JWT | Any |
| `/tasks` | POST | Tạo nhiệm vụ | JWT | Manager+ |
| `/tasks/:id/status` | PATCH | Cập nhật trạng thái | JWT | Any |
| `/tasks/:id/feedback` | POST | Gửi feedback | JWT | Manager+ |
| `/tasks/summary/me` | GET | Tóm tắt nhiệm vụ | JWT | Any |
| `/tasks/notify/upcoming-deadlines` | POST | Thông báo deadline | JWT | Admin |
| `/tasks/notify/overdue` | POST | Thông báo quá hạn | JWT | Admin |

#### Forum

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/forum/posts` | GET | Danh sách bài viết | JWT | Any |
| `/forum/posts/:id` | GET | Chi tiết bài viết | JWT | Any |
| `/forum/posts` | POST | Tạo bài viết | JWT | Any |
| `/forum/posts/:id` | PATCH | Sửa bài viết | JWT | Author/Admin |
| `/forum/posts/:id` | DELETE | Xóa bài viết | JWT | Author/Admin |
| `/forum/posts/:id/comments` | GET | Comments của bài viết | JWT | Any |
| `/forum/comments` | POST | Tạo comment | JWT | Any |
| `/forum/comments/:id` | DELETE | Xóa comment | JWT | Author/Admin |

#### Documents

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/documents` | GET | Danh sách tài liệu | JWT | Any |
| `/documents/categories` | GET | Danh sách categories | JWT | Any |
| `/documents/:id` | GET | Chi tiết tài liệu | JWT | Any |
| `/documents/:id/download` | GET | Download tài liệu | JWT | Any |
| `/documents/templates` | GET | Lấy danh sách templates | JWT | Any |
| `/documents` | POST | Upload tài liệu | JWT | Manager+ |
| `/documents/templates` | POST | Tạo template | JWT | Admin |
| `/documents/generate/:templateId` | POST | Tạo từ template | JWT | Manager+ |
| `/documents/:id` | PATCH | Cập nhật tài liệu | JWT | Author/Admin |
| `/documents/:id` | DELETE | Xóa tài liệu | JWT | Author/Admin |
| `/documents/search` | GET | Tìm kiếm tài liệu | JWT | Any |

#### Notifications

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/notifications` | GET | Danh sách thông báo | JWT | Any |
| `/notifications/:id` | GET | Chi tiết thông báo | JWT | Recipient |
| `/notifications` | POST | Tạo thông báo | JWT | Admin/Manager |
| `/notifications/bulk` | POST | Tạo nhiều thông báo | JWT | Admin |
| `/notifications/:id/read` | PATCH | Đánh dấu đã đọc | JWT | Recipient |
| `/notifications/user/:userId/mark-all-read` | POST | Đánh dấu tất cả đã đọc | JWT | Recipient |
| `/notifications/:id` | DELETE | Xóa thông báo | JWT | Recipient/Admin |
| `/notifications/unread` | GET | Đếm thông báo chưa đọc | JWT | Any |

#### Attendance

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/attendance` | GET | Lịch sử điểm danh | JWT | Self/Admin |
| `/attendance/date` | GET | Điểm danh theo ngày | JWT | Admin |
| `/attendance/check-in` | POST | Check-in | JWT | Any |
| `/attendance/check-out` | POST | Check-out | JWT | Any |
| `/attendance/leave` | POST | Đăng ký nghỉ | JWT | Any |
| `/attendance/leave/:id/approve` | POST | Phê duyệt nghỉ | JWT | Manager+ |
| `/attendance/leave/:id/reject` | POST | Từ chối nghỉ | JWT | Manager+ |
| `/attendance/stats` | GET | Thống kê điểm danh | JWT | Self/Admin |

#### Search

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/search/health` | GET | Kiểm tra ES | JWT | Admin |
| `/search/tasks` | GET | Tìm kiếm nhiệm vụ | JWT | Any |
| `/search/documents` | GET | Tìm kiếm tài liệu | JWT | Any |
| `/search/notifications` | GET | Tìm kiếm thông báo | JWT | Any |
| `/search/document-stats` | GET | Thống kê tài liệu | JWT | Admin |

#### Dashboard

| Endpoint | Method | Mô tả | Xác thực | Roles |
|----------|--------|-------|----------|-------|
| `/dashboard/stats` | GET | Thống kê tổng quan | JWT | Admin |
| `/dashboard/attendance-stats` | GET | Thống kê điểm danh | JWT | Admin |
| `/dashboard/training-stats` | GET | Thống kê đào tạo | JWT | Admin |
| `/dashboard/overview` | GET | Tổng quan | JWT | Admin |
| `/dashboard/forum-activity` | GET | Hoạt động diễn đàn | JWT | Admin |
| `/dashboard/document-stats` | GET | Thống kê tài liệu | JWT | Admin |
| `/dashboard/task-stats` | GET | Thống kê nhiệm vụ | JWT | Admin |
| `/dashboard/user-stats` | GET | Thống kê người dùng | JWT | Admin |
| `/dashboard/refresh` | GET | Làm mới dữ liệu | JWT | Admin |
| `/dashboard/system-logs` | GET | Log hệ thống | JWT | Admin |

## Kiểm thử

### Unit Tests

```bash
# Chạy unit tests
npm run test

# Test coverage report
npm run test:cov
```

### E2E Tests

```bash
# Chạy end-to-end tests
npm run test:e2e
```

### API Testing với Swagger

Swagger UI có sẵn tại `http://localhost:3000/api` để test các endpoints trực tiếp. Steps:

1. Đăng nhập bằng `/auth/login` để nhận JWT token
2. Nhấp vào nút "Authorize" và nhập token theo định dạng `Bearer <token>`
3. Bây giờ bạn có thể test tất cả các API endpoints được bảo vệ

### Test Redis Connection

Kiểm tra kết nối Redis sử dụng script:

```bash
node scripts/setup-redis-wsl.js
```

Output mong đợi:
```
Testing Redis connection to 192.168.178.204:6379...
✅ Redis connection successful!
```

## Redis và WebSocket

### Cấu hình Redis

File cấu hình Redis nằm trong `src/common/services/redis.service.ts`. Mặc định kết nối đến:
- Host: 192.168.178.204 (hoặc từ REDIS_HOST env)
- Port: 6379 (hoặc từ REDIS_PORT env)

Nếu sử dụng WSL trên Windows, cấu hình và đảm bảo Redis được bind đến địa chỉ IP WSL:

```bash
# Xem địa chỉ IP WSL
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'

# Cấu hình Redis để chấp nhận kết nối từ Windows
./scripts/fix-redis-wsl.sh
```

### Dịch vụ sử dụng Redis

1. **RateLimiterService** (`src/common/services/rate-limiter.service.ts`)
   - Rate limiting để bảo vệ API khỏi tấn công
   - Fallback sang memory rate limiting khi Redis không khả dụng

2. **QueueService** (`src/shared/services/queue.service.ts`)
   - Xử lý các tác vụ bất đồng bộ (notifications, emails)
   - Quản lý worker và job queue

3. **OnlineUsersService** (`src/shared/services/online-users.service.ts`)
   - Theo dõi trạng thái online của người dùng
   - Cung cấp presence API

4. **CommentCounterService** (`src/forum/services/comment-counter.service.ts`)
   - Đếm và cache số lượng comments cho mỗi bài viết
   - Tối ưu hiệu năng truy vấn diễn đàn

5. **UnreadCounterService** (`src/notifications/services/unread-counter.service.ts`)
   - Theo dõi số lượng thông báo chưa đọc
   - Đồng bộ giữa các sessions của cùng một user

### WebSocket Notification System

System sử dụng Socket.io trong `src/notifications/notifications.gateway.ts` để cung cấp real-time notifications.

```typescript
// Kết nối đến WebSocket server từ client
const socket = io('http://localhost:3000/notifications', {
  path: '/notifications/socket.io',
  auth: {
    token: 'JWT_TOKEN_HERE'
  }
});

// Lắng nghe các events
socket.on('notification', (data) => console.log('New notification:', data));
socket.on('notification_read', (data) => console.log('Notification read:', data));
socket.on('all_notifications_read', () => console.log('All notifications read'));
socket.on('unread_count', (data) => console.log('Unread count:', data.unreadCount));
```

Các events chính:
- `notification`: Gửi thông báo mới
- `notification_read`: Thông báo đã đọc
- `all_notifications_read`: Tất cả thông báo đã đọc
- `unread_count`: Đếm thông báo chưa đọc

## Elasticsearch

### Cấu hình

Elasticsearch được cấu hình trong `src/elasticsearch/elasticsearch.module.ts` và mặc định kết nối đến:
- URL: https://localhost:9200
- Username: elastic
- Password: Từ env (hoặc mặc định '26121999')

### Indices

Ba indices chính:
- **forum-posts**: Bài viết diễn đàn
- **documents**: Tài liệu
- **courses**: Khóa học
- **tasks**: Nhiệm vụ
- **notifications**: Thông báo

### Tìm kiếm

Các loại tìm kiếm hỗ trợ:
- **Term search**: Tìm chính xác từ khóa
- **Full-text search**: Tìm kiếm nội dung văn bản
- **Fuzzy search**: Tìm kiếm gần đúng
- **Date range**: Lọc theo khoảng thời gian
- **Aggregations**: Thống kê và phân tích dữ liệu

### Reindex Data

Nếu cần reindex dữ liệu vào Elasticsearch:

```bash
# Reindex tất cả dữ liệu
curl -X POST http://localhost:3000/api/search/reindex-all

# Reindex một loại dữ liệu cụ thể
curl -X POST http://localhost:3000/api/search/reindex?type=documents
```

## Quản lý cấu hình

### Environment Variables

Các biến môi trường quan trọng trong `.env`:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=staffdev

# JWT
JWT_SECRET=staffdev_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=192.168.178.204
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_NODE=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=26121999
NODE_TLS_REJECT_UNAUTHORIZED=0

# App
PORT=3000
API_PREFIX=api
ALLOWED_ORIGINS=http://localhost:4200
```

## Triển khai

### Production Build

```bash
# Build sản phẩm
npm run build

# Chạy sản phẩm
npm run start:prod
```

### PM2 Process Management

```bash
# Cài đặt PM2
npm install -g pm2

# Chạy ứng dụng với PM2
pm2 start dist/main.js --name staffdev-backend

# Xem logs
pm2 logs staffdev-backend

# Khởi động lại
pm2 restart staffdev-backend
```

## Xử lý lỗi thường gặp

### Redis Connection Issues

Nếu gặp lỗi kết nối Redis:

1. Kiểm tra Redis đang chạy: `redis-cli ping`
2. Kiểm tra bind address trong redis.conf
3. Chạy script để test kết nối: `node scripts/setup-redis-wsl.js`
4. Nếu sử dụng WSL, chạy: `./scripts/fix-redis-wsl.sh`
5. Cập nhật cấu hình Redis: `node update-redis-config.js`

Lỗi log thường gặp:
```
Redis connection timeout, falling back to memory store
```

### Elasticsearch Connection Issues

Nếu gặp lỗi kết nối Elasticsearch:

1. Kiểm tra Elasticsearch đang chạy: `curl -X GET "localhost:9200"`
2. Xác minh thông tin xác thực trong `.env`
3. Đảm bảo cài đặt `NODE_TLS_REJECT_UNAUTHORIZED=0` nếu dùng self-signed certificate
4. Kiểm tra logs: `npm run start:dev`

Lỗi log thường gặp:
```
[ElasticsearchModule] Failed to connect to Elasticsearch: self-signed certificate
```

### Database Migration Issues

Nếu gặp lỗi với migrations:

1. Reset database migrations: `npm run migration:revert`
2. Chạy lại migrations: `npm run migration:run`
3. Nếu cần thiết, tạo migration mới: `npm run migration:generate -n <name>`

### Permission Issues

Nếu gặp lỗi 403 Forbidden:

1. Kiểm tra JWT token trong Authorization header
2. Xác minh user có role phù hợp cho route đó
3. Kiểm tra log để xem lỗi cụ thể: `npm run start:dev`

---

Tài liệu này cung cấp hướng dẫn toàn diện để phát triển và vận hành backend StaffDev. Tham khảo FRONTEND_INTEGRATION.md cho tài liệu tích hợp frontend. 