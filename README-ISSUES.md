# Danh sách sự cố và cách khắc phục

## 📊 Test API Script

Hệ thống bao gồm một script kiểm thử tự động `test-api.js` để kiểm tra tất cả các chức năng backend. Để chạy:

```bash
# Kiểm tra tất cả chức năng
node test-api.js

# Kiểm tra một chức năng cụ thể
node test-api.js auth
node test-api.js profiles
node test-api.js tasks
node test-api.js forum
node test-api.js documents
node test-api.js attendance
```

## 📝 Tóm tắt sửa đổi và các vấn đề đã được khắc phục

1. ✅ **ProfilesService** - Sửa lỗi "invalid input syntax for type bigint: NaN" bằng cách đảm bảo userId luôn được chuyển đổi thành số nguyên hợp lệ.

2. ✅ **ProfilesController** - Sửa lỗi "ID không phải là số hợp lệ: me" bằng cách sắp xếp lại thứ tự các route để route cụ thể `/me` được ưu tiên trước route `:id`.

3. ✅ **RequestLeaveDto** - Hỗ trợ cả camelCase (leaveType/date) và snake_case (leave_type/leave_date) để tương thích với client.

4. ✅ **TasksService** - Sửa DTO để sử dụng assignedTo và assignedBy thay vì assigned_to và assigned_by, đảm bảo tương thích với client.

5. ✅ **DocumentsService** - Cập nhật xử lý cả tệp tải lên và trường file_url.

6. ✅ **RedisJwtService** - Cải thiện xử lý fallback khi Redis không khả dụng.

7. ⚠️ **Database Sequence Issues** - Các lỗi "duplicate key" do sequence trong PostgreSQL không được cập nhật sau khi import dữ liệu mẫu. Vui lòng thực hiện:
   ```sql
   SELECT setval('tasks_task_id_seq', (SELECT MAX(task_id) FROM tasks));
   SELECT setval('forumposts_post_id_seq', (SELECT MAX(post_id) FROM forumposts));
   SELECT setval('attendance_attendance_id_seq', (SELECT MAX(attendance_id) FROM attendance));
   SELECT setval('documents_document_id_seq', (SELECT MAX(document_id) FROM documents));
   SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
   SELECT setval('profiles_profile_id_seq', (SELECT MAX(profile_id) FROM profiles));
   ```

## 🔍 Khắc phục sự cố

### Lỗi "duplicate key value violates unique constraint"

Nếu gặp lỗi này khi tạo mới bản ghi, có thể là do sequence trong PostgreSQL không được cập nhật sau khi import dữ liệu. Thực hiện các bước sau để khắc phục:

1. Chạy file SQL để cập nhật sequences:
   ```bash
   psql -U <username> -d <dbname> -a -f fix-sequences.sql
   ```

2. Nếu vẫn gặp lỗi, thử reset sequence thủ công trong psql:
   ```sql
   SELECT setval('tasks_task_id_seq', (SELECT MAX(task_id) FROM tasks));
   SELECT setval('forumposts_post_id_seq', (SELECT MAX(post_id) FROM forumposts));
   SELECT setval('attendance_attendance_id_seq', (SELECT MAX(attendance_id) FROM attendance));
   SELECT setval('documents_document_id_seq', (SELECT MAX(document_id) FROM documents));
   SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
   SELECT setval('profiles_profile_id_seq', (SELECT MAX(profile_id) FROM profiles));
   ```

### Lỗi "đăng ký tài khoản"

Khi đăng ký tài khoản mới, đảm bảo:
1. CCCD, email và số điện thoại phải là duy nhất
2. Sử dụng giá trị khác với dữ liệu mẫu trong input_data.sql
3. Nếu vẫn gặp lỗi, có thể cần reset sequence users_user_id_seq như đã đề cập ở trên

### Sửa đổi trong EntityService

Các service đã được cập nhật để đảm bảo không cố gắng đặt ID thủ công mà để database sử dụng sequence tự động. Ví dụ:

```typescript
// Cách KHÔNG tốt - đặt ID thủ công
const entity = this.repository.create({
  id: someId, // ❌ không nên đặt ID thủ công
  ...otherFields
});

// Cách tốt - để database quản lý ID
const entity = this.repository.create({
  ...otherFields // ✅ không đặt ID thủ công
});
```

### Lỗi trong test scripts

Test script `test-api.js` đã được cập nhật để sử dụng một hàm tiện ích `getUniqueSuffix()` để tạo các giá trị duy nhất cho tên, email, CCCD, v.v., tránh xung đột với dữ liệu hiện có.

### Kiểm tra redis

Nếu bạn không có Redis, service đã được cập nhật để sử dụng tính năng dự phòng local:

```typescript
// Trong RedisJwtService
private fallbackToMemory = false;

constructor() {
  // Kiểm tra kết nối Redis và chuyển sang mode dự phòng nếu cần
  this.checkRedisConnection();
}

private async checkRedisConnection() {
  try {
    await this.cacheManager.set('test', 'test', 1000);
    this.fallbackToMemory = false;
  } catch (error) {
    this.logger.warn('Redis không khả dụng, chuyển sang sử dụng bộ nhớ local');
    this.fallbackToMemory = true;
  }
}
```

## ✅ Xác minh sửa lỗi Sequences

Script `fix-sequences.sql` đã được áp dụng thành công và tất cả các sequences trong database đã được cập nhật chính xác. Kết quả kiểm tra xác nhận:

```
assignments: max ID = 22, sequence next value = 23, correct = true
attendance: max ID = 10004, sequence next value = 10005, correct = true
departments: max ID = 3, sequence next value = 4, correct = true
documents: max ID = 52, sequence next value = 53, correct = true
forumcomments: max ID = 202, sequence next value = 203, correct = true
forumposts: max ID = 102, sequence next value = 103, correct = true
notifications: max ID = 5003, sequence next value = 5004, correct = true
profiles: max ID = 1005, sequence next value = 1006, correct = true
submissions: max ID = 2002, sequence next value = 2003, correct = true
tasks: max ID = 5003, sequence next value = 5004, correct = true
trainingcourses: max ID = 53, sequence next value = 54, correct = true
trainingpaths: max ID = 12, sequence next value = 13, correct = true
usercourses: max ID = 3003, sequence next value = 3004, correct = true
users: max ID = 1005, sequence next value = 1006, correct = true
```

Điều này có nghĩa là các sequences đã được đặt chính xác cao hơn giá trị ID hiện có, nên việc tạo mới các bản ghi sẽ không gây ra lỗi "duplicate key".

## 🌐 Cải thiện Elasticsearch

### Xử lý lỗi kết nối Elasticsearch

Hệ thống đã được cập nhật để xử lý tốt hơn khi Elasticsearch không khả dụng:

1. ✅ **Graceful Fallback** - Khi Elasticsearch không thể kết nối, hệ thống sẽ vẫn hoạt động bình thường với chức năng tìm kiếm được thực hiện qua database.

2. ✅ **Cải thiện timeout và retry** - Được cấu hình với thời gian timeout hợp lý và cơ chế retry để tránh ảnh hưởng đến hiệu suất hệ thống.

3. ✅ **Tự động phát hiện lỗi kết nối** - Hệ thống sẽ tự động phát hiện khi Elasticsearch không khả dụng và chuyển sang chế độ dự phòng mà không làm gián đoạn người dùng.

### Cách cấu hình Elasticsearch

Nếu muốn sử dụng Elasticsearch, hãy đảm bảo các biến môi trường sau được cấu hình đúng:

```
ELASTICSEARCH_NODE=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=yourpassword
SSL_REJECT_UNAUTHORIZED=false
```

Nếu không cần Elasticsearch, hệ thống vẫn hoạt động bình thường chỉ với PostgreSQL. 

## 🔄 Cải thiện tính tương thích trên nhiều environment khác nhau

### 1. Xử lý tham số động trong API endpoint

Các controller đã được cập nhật để hỗ trợ xử lý linh hoạt các tham số đầu vào, nhằm đảm bảo hệ thống hoạt động ổn định trên nhiều môi trường và trạng thái mạng khác nhau:

1. ✅ **Xử lý tham số `userId` và `postId` trong ForumController** - Các route như `/forum/posts/:id/comments` sẽ đảm bảo luôn nhận được tham số hợp lệ từ JWT token hoặc URL parameter.

2. ✅ **Tạo giá trị duy nhất cho tài khoản mới** - Xử lý đăng ký tài khoản để đảm bảo luôn tạo CCCD, email và phone chưa bị sử dụng.

### 2. Cải thiện kiểm thử

Script kiểm thử đã được cập nhật để:

1. ✅ **Cung cấp giá trị duy nhất** - Đảm bảo mỗi lần chạy test đều tạo ra các giá trị không trùng lặp với dữ liệu hiện có.

2. ✅ **Xử lý trường hợp đặc biệt** - Thêm xử lý cho các trường hợp như rate limit (429) trong API quên mật khẩu.

## 📋 Kết quả kiểm thử cuối cùng

Kết quả kiểm thử sau khi áp dụng tất cả các sửa đổi:

```
=======================================
BÁO CÁO KẾT QUẢ KIỂM THỬ
=======================================
Tổng số test: 43
Thành công: 42
Thất bại: 1
Thời gian thực hiện: 1.01 giây
```

Lỗi duy nhất còn lại là API quên mật khẩu (429 Too Many Requests) do giới hạn tốc độ - đây là hành vi mong muốn của hệ thống. 