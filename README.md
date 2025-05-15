# StaffDev Backend

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-9.0.0-E0234E.svg" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-4.9.3-3178C6.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16.8-336791.svg" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7.0.15-DC382D.svg" alt="Redis">
  <img src="https://img.shields.io/badge/Elasticsearch-9.0.0-005571.svg" alt="Elasticsearch">
  <img src="https://img.shields.io/badge/JWT-Auth-000000.svg" alt="JWT">
  <img src="https://img.shields.io/badge/WebSockets-Real--time-4B32C3.svg" alt="WebSockets">
</p>

<p align="center">
  <strong>API Backend cho ứng dụng quản lý và phát triển nhân viên StaffDev - Giải pháp toàn diện cho doanh nghiệp hiện đại.</strong>
</p>

<p align="center">
  <a href="#tính-năng">Tính năng</a> •
  <a href="#kiến-trúc">Kiến trúc</a> •
  <a href="#công-nghệ">Công nghệ</a> •
  <a href="#cài-đặt">Cài đặt</a> •
  <a href="#api-documentation">API Documentation</a> •
  <a href="#triển-khai">Triển khai</a> •
  <a href="#tài-liệu-chi-tiết">Tài liệu</a>
</p>

## ✨ Tính năng

- 👥 **Quản lý nhân viên & phòng ban** - Hệ thống quản lý nhân sự toàn diện
- 📚 **Quản lý khóa học & đào tạo** - Xây dựng lộ trình phát triển nhân viên 
- ✅ **Giao & theo dõi tác vụ** - Phân công công việc với nhiều cấp độ ưu tiên
- 💬 **Diễn đàn trao đổi nội bộ** - Tăng cường giao tiếp và chia sẻ kiến thức
- 📄 **Quản lý tài liệu** - Lưu trữ và tìm kiếm tài liệu nhanh chóng
- 🔔 **Thông báo real-time** - Cập nhật ngay lập tức qua WebSockets
- 📊 **Dashboard phân tích dữ liệu** - Báo cáo và thống kê trực quan
- 🔍 **Tìm kiếm nâng cao** - Full-text search với Elasticsearch

## 🏗️ Kiến trúc

<p align="center">
  <img src="https://i.ibb.co/fdCPYNz/arch-diagram.png" alt="StaffDev Architecture" width="650">
</p>

Ứng dụng StaffDev được xây dựng theo kiến trúc module hóa:

- **Core modules**: Auth, Users, Profiles
- **Organization modules**: Departments, Training
- **Task management**: Tasks, Assignments, Attendance
- **Content modules**: Forum, Documents
- **Integration modules**: Notifications, Dashboard, Search

## 🚀 Công nghệ

- **[NestJS](https://nestjs.com/)** - Framework hiện đại cho Node.js
- **[PostgreSQL](https://www.postgresql.org/)** - Hệ quản trị cơ sở dữ liệu mạnh mẽ
- **[Redis](https://redis.io/)** - Cache, rate-limiting và real-time messaging
- **[Elasticsearch](https://www.elastic.co/)** - Tìm kiếm toàn văn nâng cao
- **[TypeORM](https://typeorm.io/)** - ORM cho TypeScript và JavaScript
- **[JWT](https://jwt.io/)** - Xác thực và phân quyền API
- **[Socket.io](https://socket.io/)** - Real-time WebSocket notifications
- **[Swagger](https://swagger.io/)** - API Documentation tự động

## 🛠️ Cài đặt

### Yêu cầu

- Node.js (v18+)
- PostgreSQL (v16.8+)
- Redis (v7.0.15+)
- Elasticsearch (v9.0.0+)

### Các bước cài đặt

```bash
# Clone repository
git clone <repository-url>
cd staffdev-backend

# Cài đặt dependencies
npm install

# Thiết lập biến môi trường
cp .env.example .env
# Chỉnh sửa file .env với thông tin kết nối

# Khởi tạo database
npm run migration:run
npm run seed

# Chạy ứng dụng
npm run start:dev
```

## 📖 API Documentation

Sau khi chạy ứng dụng, truy cập Swagger API Documentation tại:
```
http://localhost:3000/api
```

API endpoints được phân loại thành các nhóm:

- **Auth** - Đăng nhập, đăng ký, xác thực
- **Users & Profiles** - Quản lý người dùng và hồ sơ
- **Departments** - Quản lý phòng ban
- **Training** - Quản lý khóa học và lộ trình
- **Tasks** - Quản lý nhiệm vụ và deadline
- **Forum** - Bài viết và bình luận
- **Documents** - Quản lý tài liệu
- **Notifications** - Thông báo và updates
- **Search** - Tìm kiếm nâng cao
- **Dashboard** - Thống kê và báo cáo

## 🚢 Triển khai

Triển khai ứng dụng lên môi trường production:

```bash
# Build ứng dụng
npm run build

# Chạy production
npm run start:prod

# Hoặc sử dụng PM2
npm install -g pm2
pm2 start dist/main.js --name staffdev-backend
```

## 🔧 Kiểm tra hệ thống

```bash
# Kiểm tra kết nối Redis
node scripts/setup-redis-wsl.js

# Cấu hình Redis trên WSL (nếu cần)
./scripts/fix-redis-wsl.sh

# Cập nhật cấu hình Redis
node update-redis-config.js
```

## 📚 Tài liệu chi tiết

- [README-ENHANCED.md](README-ENHANCED.md) - Tài liệu kỹ thuật đầy đủ cho backend developers
- [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) - Hướng dẫn tích hợp Angular Frontend

## 📝 License

Unlicensed - © 2025 