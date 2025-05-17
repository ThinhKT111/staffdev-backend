# Hướng dẫn triển khai StaffDev Backend

Tài liệu này cung cấp hướng dẫn chi tiết để triển khai backend StaffDev trên môi trường sản phẩm.

## Các yêu cầu hệ thống

- Node.js v16.0.0 trở lên
- PostgreSQL 16.x
- Redis (bắt buộc cho quản lý token và rate limiting)
- Elasticsearch 9.x (tùy chọn cho tính năng tìm kiếm)
- Nginx (khuyến nghị cho reverse proxy)
- Git (cho quản lý mã nguồn và phiên bản)

## Quản lý mã nguồn với Git

Dự án này được quản lý bằng Git. Khi làm việc với dự án, sử dụng các lệnh Git thông thường:

```bash
# Clone repository (khi bắt đầu)
git clone <repository-url>

# Xem trạng thái hiện tại
git status

# Tạo nhánh mới
git checkout -b feature/ten-tinh-nang

# Cam kết thay đổi
git add .
git commit -m "Mô tả thay đổi"

# Đẩy thay đổi lên repository từ xa
git push origin feature/ten-tinh-nang
```

### Quy trình phát triển và triển khai

1. Phát triển tính năng mới trên nhánh riêng biệt
2. Kiểm thử kỹ lưỡng 
3. Hợp nhất vào nhánh chính khi đã ổn định
4. Khi cần triển khai, làm sạch project bằng script cleanup
5. Triển khai phiên bản đã làm sạch lên môi trường sản phẩm

## Chuẩn bị triển khai

### 1. Dọn dẹp project

Chạy script PowerShell đã cung cấp để loại bỏ các file không cần thiết (script đã được điều chỉnh để giữ lại các file Git):

```bash
./cleanup-for-production.ps1
```

### 2. Cài đặt dependencies cho production

```bash
npm install --production
```

### 3. Cấu hình môi trường

Tạo file `.env` với các cài đặt phù hợp cho môi trường của bạn:

```
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=staffdev
DB_SYNCHRONIZE=false

# JWT Auth
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Node Environment
NODE_ENV=production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600
REDIS_MAX_OBJECTS=1000

# Allowed Origins (CORS)
ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com

# Elasticsearch Configuration
ELASTICSEARCH_NODE=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_elastic_password
SSL_REJECT_UNAUTHORIZED=false

# Admin User
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=your_admin_password
```

### 4. Thiết lập cơ sở dữ liệu

Chạy các file SQL để tạo cấu trúc cơ sở dữ liệu và nạp dữ liệu mẫu:

```bash
psql -U your_db_username -d staffdev -f create_database.sql
psql -U your_db_username -d staffdev -f input_data.sql
```

## Triển khai ứng dụng

### 1. Cách thức triển khai thủ công

Khởi động ứng dụng bằng Node.js:

```bash
node dist/src/main
```

### 2. Sử dụng Process Manager (PM2) (Khuyến nghị)

Cài đặt PM2:
```bash
npm install pm2 -g
```

Tạo file cấu hình `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'staffdev-backend',
    script: 'dist/src/main.js',
    instances: 'max',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    out_file: 'logs/app-out.log',
    error_file: 'logs/app-error.log'
  }]
};
```

Khởi động ứng dụng:
```bash
pm2 start ecosystem.config.js
```

### 3. Sử dụng Docker (Tùy chọn)

Sử dụng file `docker-compose.yml` đã cung cấp:

```bash
docker-compose up -d
```

## Cấu hình Nginx (Reverse Proxy)

Tạo cấu hình Nginx cho backend:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Bảo mật

### 1. Cập nhật JWT Secret

Đảm bảo đổi JWT_SECRET trong file .env thành một chuỗi phức tạp và duy nhất.

### 2. Đặt lại mật khẩu Admin mặc định

Sau khi triển khai, đổi mật khẩu tài khoản Admin mặc định bằng API:

```
POST /api/auth/change-password
```

### 3. Cấu hình SSL

Nên sử dụng Let's Encrypt để cấu hình SSL cho Nginx:

```bash
certbot --nginx -d api.your-domain.com
```

## Theo dõi và bảo trì

### 1. Theo dõi logs

Nếu sử dụng PM2:
```bash
pm2 logs staffdev-backend
```

### 2. Kiểm tra trạng thái ứng dụng

```bash
pm2 status
```

### 3. Khởi động lại ứng dụng sau khi cập nhật

```bash
pm2 restart staffdev-backend
```

## Quản lý phiên bản và cập nhật

Khi cần cập nhật ứng dụng trên môi trường sản phẩm:

1. Kéo các thay đổi mới từ repository Git:
   ```bash
   git pull origin main
   ```

2. Xây dựng lại ứng dụng (nếu cần):
   ```bash
   npm run build
   ```

3. Khởi động lại ứng dụng:
   ```bash
   pm2 restart staffdev-backend
   ```

## Kết luận

Bây giờ bạn đã triển khai thành công backend StaffDev trên môi trường sản phẩm. Hệ thống này đã được thiết kế với cơ chế dự phòng và khả năng mở rộng để đảm bảo hoạt động ổn định.

Đối với bất kỳ vấn đề nào, hãy kiểm tra logs và đảm bảo tất cả các dịch vụ phụ thuộc (PostgreSQL, Redis, Elasticsearch) đang hoạt động chính xác. 