-- Script chèn dữ liệu kiểm thử (cố định + ngẫu nhiên) cho backend StaffDev
-- Tương thích với PostgreSQL 16.8
-- Phiên bản cập nhật cuối: 18/05/2025

-- Đầu tiên, xóa dữ liệu cũ (nếu có)
-- Lưu ý: Thứ tự xóa phải đảm bảo ràng buộc khóa ngoại
TRUNCATE TABLE forumcomments CASCADE;
TRUNCATE TABLE forumposts CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE submissions CASCADE;
TRUNCATE TABLE assignments CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE usercourses CASCADE;
TRUNCATE TABLE trainingcourses CASCADE;
TRUNCATE TABLE trainingpaths CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE departments CASCADE;

-- Đảm bảo extension uuid-ossp được kích hoạt
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hàm tạo chuỗi ngẫu nhiên
CREATE OR REPLACE FUNCTION random_string(length INTEGER) RETURNS TEXT AS $$
DECLARE
  chars TEXT[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || chars[1 + floor(random() * array_length(chars, 1))::INTEGER];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Hàm tạo ngày ngẫu nhiên trong khoảng
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE) RETURNS TIMESTAMP AS $$
BEGIN
  RETURN start_date + (random() * (end_date - start_date)::INTEGER) * INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- 1. Chèn dữ liệu cố định vào bảng Departments (3 phòng ban)
INSERT INTO Departments (department_id, department_name, manager_id) VALUES
(1, 'Phòng Nhân sự', NULL),
(2, 'Phòng Công nghệ', NULL),
(3, 'Phòng Marketing', NULL);

-- 2. Chèn dữ liệu cố định vào bảng Users (5 tài khoản mẫu)
INSERT INTO Users (user_id, cccd, password, email, phone, full_name, role, department_id, created_at, updated_at) VALUES
(1, 'CCCD0000000001', '5f4dcc3b5aa765d61d8327deb882cf99', 'admin@example.com', '0900000001', 'Nguyễn Admin', 'Admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- password: password
(2, 'CCCD0000000002', '5f4dcc3b5aa765d61d8327deb882cf99', 'teamleader@example.com', '0900000002', 'Trần TeamLeader', 'TeamLeader', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- password: password
(3, 'CCCD0000000003', '5f4dcc3b5aa765d61d8327deb882cf99', 'seniormanager@example.com', '0900000003', 'Lê SeniorManager', 'SeniorManager', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- password: password
(4, 'CCCD0000000004', '5f4dcc3b5aa765d61d8327deb882cf99', 'employee1@example.com', '0900000004', 'Phạm Employee1', 'Employee', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- password: password
(5, 'CCCD0000000005', '5f4dcc3b5aa765d61d8327deb882cf99', 'employee2@example.com', '0900000005', 'Hoàng Employee2', 'Employee', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); -- password: password

-- Cập nhật manager_id cho Departments
UPDATE Departments SET manager_id = 1 WHERE department_id = 1;
UPDATE Departments SET manager_id = 2 WHERE department_id = 2;
UPDATE Departments SET manager_id = 3 WHERE department_id = 3;

-- 3. Chèn dữ liệu cố định vào bảng Profiles
INSERT INTO Profiles (profile_id, user_id, date_of_birth, address, experience, skills, avatar_url, updated_at) VALUES
(1, 1, '1985-01-01', '123 Nguyễn Huệ, TP.HCM', '10 năm quản lý nhân sự', 'Quản lý, Giao tiếp', 'https://example.com/avatar/admin.jpg', CURRENT_TIMESTAMP),
(2, 2, '1990-02-02', '456 Lê Lợi, TP.HCM', '7 năm lãnh đạo dự án CNTT', 'Lập trình, Quản lý dự án', 'https://example.com/avatar/teamleader.jpg', CURRENT_TIMESTAMP),
(3, 3, '1988-03-03', '789 Trần Phú, TP.HCM', '8 năm quản lý marketing', 'Marketing, Phân tích dữ liệu', 'https://example.com/avatar/seniormanager.jpg', CURRENT_TIMESTAMP),
(4, 4, '1995-04-04', '101 Hùng Vương, TP.HCM', '3 năm lập trình', 'JavaScript, React', 'https://example.com/avatar/employee1.jpg', CURRENT_TIMESTAMP),
(5, 5, '1997-05-05', '202 Nguyễn Thị Minh Khai, TP.HCM', '2 năm thiết kế quảng cáo', 'Photoshop, Illustrator', 'https://example.com/avatar/employee2.jpg', CURRENT_TIMESTAMP);

-- 4. Chèn dữ liệu cố định vào bảng Attendance
INSERT INTO Attendance (attendance_id, user_id, check_in, check_out, overtime_hours, leave_type, leave_date, status, note) VALUES
(1, 4, '2025-04-25 08:00:00', '2025-04-25 17:30:00', 0.5, NULL, NULL, NULL, NULL),
(2, 4, NULL, NULL, NULL, 'Annual', '2025-04-26', 'pending', 'Nghỉ phép cá nhân'),
(3, 5, '2025-04-25 08:15:00', '2025-04-25 17:00:00', NULL, NULL, NULL, NULL, NULL),
(4, 5, NULL, NULL, NULL, 'Sick', '2025-04-27', 'approved', 'Nghỉ ốm');

-- 5. Chèn dữ liệu cố định vào bảng TrainingPaths
INSERT INTO TrainingPaths (training_path_id, title, description, department_id, duration, created_by, total_courses, duration_in_weeks, is_active, created_at) VALUES
(1, 'Lộ trình CNTT', 'Đào tạo kỹ năng lập trình', 2, 'LongTerm', 2, 2, 12, true, CURRENT_TIMESTAMP),
(2, 'Lộ trình Marketing', 'Đào tạo kỹ năng tiếp thị', 3, 'ShortTerm', 3, 1, 4, true, CURRENT_TIMESTAMP);

-- 6. Chèn dữ liệu cố định vào bảng TrainingCourses
INSERT INTO TrainingCourses (course_id, training_path_id, title, description, type, duration_hours, level, total_lessons, is_active, created_at) VALUES
(1, 1, 'Lập trình JavaScript', 'Học JavaScript cơ bản', 'Online', 20, 'beginner', 10, true, CURRENT_TIMESTAMP),
(2, 1, 'ReactJS Nâng cao', 'Học ReactJS chuyên sâu', 'Video', 30, 'advanced', 15, true, CURRENT_TIMESTAMP),
(3, 2, 'SEO Cơ bản', 'Học tối ưu hóa công cụ tìm kiếm', 'Offline', 10, 'beginner', 5, true, CURRENT_TIMESTAMP);

-- 7. Chèn dữ liệu cố định vào bảng UserCourses
INSERT INTO UserCourses (user_course_id, user_id, course_id, status, completion_date, score) VALUES
(1, 4, 1, 'InProgress', NULL, NULL),
(2, 4, 2, 'NotStarted', NULL, NULL),
(3, 5, 3, 'Completed', '2025-04-20', 85.5);

-- 8. Chèn dữ liệu cố định vào bảng Tasks
INSERT INTO Tasks (task_id, title, description, assigned_to, assigned_by, deadline, status, score, feedback, created_at, updated_at) VALUES
(1, 'Hoàn thành báo cáo CNTT', 'Tổng hợp báo cáo dự án CNTT', 4, 2, '2025-05-01', 'InProgress', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Thiết kế banner quảng cáo', 'Thiết kế banner cho chiến dịch mới', 5, 3, '2025-04-30', 'Completed', 90, 'Rất sáng tạo!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Kiểm tra hệ thống', 'Kiểm tra lỗi hệ thống nội bộ', 4, 2, '2025-05-05', 'Pending', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 9. Chèn dữ liệu cố định vào bảng Assignments
INSERT INTO Assignments (assignment_id, course_id, title, description, max_submissions, deadline, created_at) VALUES
(1, 1, 'Bài tập JavaScript', 'Viết hàm tính tổng', 3, '2025-05-10', CURRENT_TIMESTAMP),
(2, 3, 'Bài tập SEO', 'Phân tích từ khóa', 2, '2025-04-25', CURRENT_TIMESTAMP);

-- 10. Chèn dữ liệu cố định vào bảng Submissions
INSERT INTO Submissions (submission_id, assignment_id, user_id, submission_content, submitted_at, testcase_passed, total_testcases) VALUES
(1, 1, 4, 'function sum(a, b) { return a + b; }', '2025-04-25 10:00:00', 8, 10),
(2, 2, 5, 'Danh sách từ khóa: SEO, Marketing', '2025-04-20 14:00:00', 5, 5);

-- 11. Chèn dữ liệu cố định vào bảng Documents
INSERT INTO Documents (document_id, title, file_url, category, uploaded_by, uploaded_at) VALUES
(1, 'Hướng dẫn sử dụng hệ thống', 'https://example.com/docs/guide.pdf', 'Hướng dẫn', 1, CURRENT_TIMESTAMP),
(2, 'Báo cáo quý 1', 'https://example.com/docs/report.pdf', 'Báo cáo', 3, CURRENT_TIMESTAMP);

-- 12. Chèn dữ liệu cố định vào bảng Notifications
INSERT INTO Notifications (notification_id, user_id, title, content, type, is_read, created_at) VALUES
(1, 4, 'Nhiệm vụ mới', 'Bạn được giao nhiệm vụ Hoàn thành báo cáo CNTT', 'Task', false, CURRENT_TIMESTAMP),
(2, 5, 'Khóa học hoàn thành', 'Chúc mừng bạn đã hoàn thành khóa học SEO', 'Training', true, CURRENT_TIMESTAMP),
(3, 4, 'Bài tập mới', 'Bài tập JavaScript đã được giao', 'Assignment', false, CURRENT_TIMESTAMP);

-- 13. Chèn dữ liệu cố định vào bảng ForumPosts
INSERT INTO ForumPosts (post_id, user_id, title, content, created_at, updated_at) VALUES
(1, 4, 'Chia sẻ kinh nghiệm học JavaScript', 'JavaScript rất thú vị...', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 5, 'Câu hỏi về SEO', 'Làm thế nào để cải thiện SEO?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 14. Chèn dữ liệu cố định vào bảng ForumComments
INSERT INTO ForumComments (comment_id, post_id, user_id, content, created_at) VALUES
(1, 1, 2, 'Cảm ơn bạn đã chia sẻ!', CURRENT_TIMESTAMP),
(2, 2, 3, 'Bạn nên tập trung vào từ khóa dài.', CURRENT_TIMESTAMP);

-- 15. Chèn dữ liệu ngẫu nhiên (1000 người dùng và bản ghi liên quan)
-- Users (1000 người dùng với cccd bắt đầu từ CCCD0000001001 để tránh trùng lặp)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO Users (user_id, cccd, password, email, phone, full_name, role, department_id, created_at, updated_at)
    VALUES (
      5 + i, -- Bắt đầu từ user_id = 6
      'CCCD' || LPAD((1000 + i)::TEXT, 10, '0'), -- CCCD0000001001 đến CCCD0000010000
      '5f4dcc3b5aa765d61d8327deb882cf99', -- password: password
      'user' || (1000 + i) || '@example.com', -- user1001@example.com
      '090' || LPAD((1000 + i)::TEXT, 7, '0'), -- 0900001001
      'Nhân viên ' || (1000 + i), -- Nhân viên 1001
      CASE WHEN random() < 0.1 THEN 'TeamLeader' ELSE 'Employee' END, -- 10% là TeamLeader
      (1 + floor(random() * 3))::INTEGER, -- department_id từ 1 đến 3
      CURRENT_TIMESTAMP - INTERVAL '1 year' * random(),
      CURRENT_TIMESTAMP
    );
  END LOOP;
END $$;

-- Profiles cho 1000 người dùng ngẫu nhiên
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO Profiles (profile_id, user_id, date_of_birth, address, experience, skills, avatar_url, updated_at)
    VALUES (
      5 + i,
      5 + i,
      '1970-01-01'::DATE + (floor(random() * 18250)::INTEGER * INTERVAL '1 day'), -- Ngày sinh ngẫu nhiên từ 1970 đến 2020
      'Số ' || (1000 + i) || ' Đường Ngẫu Nhiên, TP.HCM',
      floor(random() * 10) || ' năm kinh nghiệm',
      CASE WHEN random() < 0.5 THEN 'JavaScript, React' ELSE 'Marketing, SEO' END,
      'https://example.com/avatar/user' || (1000 + i) || '.jpg',
      CURRENT_TIMESTAMP
    );
  END LOOP;
END $$;

-- Attendance cho 1000 người dùng (mỗi người có 10 bản ghi)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    FOR j IN 1..10 LOOP
      INSERT INTO Attendance (attendance_id, user_id, check_in, check_out, overtime_hours, leave_type, leave_date, status, note)
      VALUES (
        4 + (i-1)*10 + j,
        5 + i,
        CASE WHEN random() < 0.8 THEN ('2025-04-01 08:00:00'::TIMESTAMP + INTERVAL '1 day' * j) ELSE NULL END,
        CASE WHEN random() < 0.8 THEN ('2025-04-01 17:00:00'::TIMESTAMP + INTERVAL '1 day' * j + INTERVAL '1 hour' * random()) ELSE NULL END,
        CASE WHEN random() < 0.8 THEN random() * 2 ELSE NULL END,
        CASE WHEN random() < 0.2 THEN (ARRAY['Annual', 'Sick', 'Unpaid'])[1 + floor(random() * 3)::INTEGER] ELSE NULL END,
        CASE WHEN random() < 0.2 THEN ('2025-04-01'::DATE + INTERVAL '1 day' * j)::DATE ELSE NULL END,
        CASE WHEN random() < 0.2 THEN (ARRAY['pending', 'approved', 'rejected'])[1 + floor(random() * 3)::INTEGER] ELSE NULL END,
        CASE WHEN random() < 0.2 THEN 'Ghi chú ' || j ELSE NULL END
      );
    END LOOP;
  END LOOP;
END $$;

-- TrainingPaths bổ sung (10 lộ trình ngẫu nhiên)
DO $$
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO TrainingPaths (training_path_id, title, description, department_id, duration, created_by, total_courses, duration_in_weeks, is_active, created_at)
    VALUES (
      2 + i,
      'Lộ trình ' || (i + 2),
      'Đào tạo kỹ năng ' || (i + 2),
      (1 + floor(random() * 3))::INTEGER,
      CASE WHEN random() < 0.5 THEN 'ShortTerm' ELSE 'LongTerm' END,
      (1 + floor(random() * 5))::INTEGER,
      floor(random() * 5)::INTEGER,
      floor(random() * 20)::INTEGER,
      random() < 0.8,
      CURRENT_TIMESTAMP - INTERVAL '1 year' * random()
    );
  END LOOP;
END $$;

-- TrainingCourses bổ sung (50 khóa học ngẫu nhiên)
DO $$
BEGIN
  FOR i IN 1..50 LOOP
    INSERT INTO TrainingCourses (course_id, training_path_id, title, description, type, duration_hours, level, total_lessons, is_active, created_at)
    VALUES (
      3 + i,
      (1 + floor(random() * 12))::INTEGER,
      'Khóa học ' || (i + 3),
      'Mô tả khóa học ' || (i + 3),
      (ARRAY['Online', 'Offline', 'Video', 'Document'])[1 + floor(random() * 4)::INTEGER],
      floor(random() * 40)::INTEGER,
      (ARRAY['beginner', 'intermediate', 'advanced'])[1 + floor(random() * 3)::INTEGER],
      floor(random() * 20)::INTEGER,
      random() < 0.9,
      CURRENT_TIMESTAMP - INTERVAL '1 year' * random()
    );
  END LOOP;
END $$;

-- UserCourses cho 1000 người dùng (mỗi người đăng ký 3 khóa học)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    FOR j IN 1..3 LOOP
      INSERT INTO UserCourses (user_course_id, user_id, course_id, status, completion_date, score)
      VALUES (
        3 + (i-1)*3 + j,
        5 + i,
        (1 + floor(random() * 53))::INTEGER,
        (ARRAY['NotStarted', 'InProgress', 'Completed'])[1 + floor(random() * 3)::INTEGER],
        CASE WHEN random() < 0.3 THEN random_date('2025-01-01', '2025-04-25') ELSE NULL END,
        CASE WHEN random() < 0.3 THEN floor(random() * 100) ELSE NULL END
      );
    END LOOP;
  END LOOP;
END $$;

-- Tasks cho 1000 người dùng (mỗi người có 5 nhiệm vụ)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    FOR j IN 1..5 LOOP
      INSERT INTO Tasks (task_id, title, description, assigned_to, assigned_by, deadline, status, score, feedback, created_at, updated_at)
      VALUES (
        3 + (i-1)*5 + j,
        'Nhiệm vụ ' || ((i-1)*5 + j + 3),
        'Mô tả nhiệm vụ ' || ((i-1)*5 + j + 3),
        5 + i,
        (1 + floor(random() * 5))::INTEGER,
        random_date('2025-04-25', '2025-06-30'),
        (ARRAY['Pending', 'InProgress', 'Completed', 'Rejected'])[1 + floor(random() * 4)::INTEGER],
        CASE WHEN random() < 0.3 THEN floor(random() * 100) ELSE NULL END,
        CASE WHEN random() < 0.3 THEN 'Phản hồi ' || j ELSE NULL END,
        random_date('2025-01-01', '2025-04-25'),
        CURRENT_TIMESTAMP
      );
    END LOOP;
  END LOOP;
END $$;

-- Assignments bổ sung (20 bài tập ngẫu nhiên)
DO $$
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO Assignments (assignment_id, course_id, title, description, max_submissions, deadline, created_at)
    VALUES (
      2 + i,
      (1 + floor(random() * 53))::INTEGER,
      'Bài tập ' || (i + 2),
      'Mô tả bài tập ' || (i + 2),
      floor(random() * 5)::INTEGER,
      random_date('2025-04-25', '2025-06-30'),
      random_date('2025-01-01', '2025-04-25')
    );
  END LOOP;
END $$;

-- Submissions cho 1000 người dùng (mỗi người nộp 2 bài)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    FOR j IN 1..2 LOOP
      INSERT INTO Submissions (submission_id, assignment_id, user_id, submission_content, submitted_at, testcase_passed, total_testcases)
      VALUES (
        2 + (i-1)*2 + j,
        (1 + floor(random() * 22))::INTEGER,
        5 + i,
        'Nội dung bài nộp ' || ((i-1)*2 + j + 2),
        random_date('2025-01-01', '2025-04-25'),
        floor(random() * 10)::INTEGER,
        10
      );
    END LOOP;
  END LOOP;
END $$;

-- Documents bổ sung (58 tài liệu ngẫu nhiên để đạt 60 tài liệu)
DO $$
BEGIN
  FOR i IN 1..58 LOOP
    INSERT INTO Documents (document_id, title, file_url, category, uploaded_by, uploaded_at)
    VALUES (
      2 + i,
      'Tài liệu ' || (i + 2),
      'https://example.com/docs/doc' || (i + 2) || '.pdf',
      (ARRAY['Hướng dẫn', 'Báo cáo', 'Tài liệu đào tạo'])[1 + floor(random() * 3)::INTEGER],
      (1 + floor(random() * 1005))::INTEGER,
      random_date('2025-01-01', '2025-04-25')
    );
  END LOOP;
END $$;

-- Notifications cho 1000 người dùng (mỗi người có 5 thông báo)
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    FOR j IN 1..5 LOOP
      INSERT INTO Notifications (notification_id, user_id, title, content, type, is_read, created_at)
      VALUES (
        3 + (i-1)*5 + j,
        5 + i,
        'Thông báo ' || ((i-1)*5 + j + 3),
        'Nội dung thông báo ' || ((i-1)*5 + j + 3),
        (ARRAY['Task', 'Assignment', 'Training', 'General'])[1 + floor(random() * 4)::INTEGER],
        random() < 0.5,
        random_date('2025-01-01', '2025-04-25')
      );
    END LOOP;
  END LOOP;
END $$;

-- ForumPosts bổ sung (108 bài viết ngẫu nhiên để đạt 110 bài viết)
DO $$
BEGIN
  FOR i IN 1..108 LOOP
    INSERT INTO ForumPosts (post_id, user_id, title, content, created_at, updated_at)
    VALUES (
      2 + i,
      (1 + floor(random() * 1005))::INTEGER,
      'Bài viết ' || (i + 2),
      'Nội dung bài viết ' || (i + 2),
      random_date('2025-01-01', '2025-04-25'),
      random_date('2025-01-01', '2025-04-25')
    );
  END LOOP;
END $$;

-- ForumComments bổ sung (206 bình luận ngẫu nhiên để đạt 208 bình luận)
DO $$
BEGIN
  FOR i IN 1..206 LOOP
    INSERT INTO ForumComments (comment_id, post_id, user_id, content, created_at)
    VALUES (
      2 + i,
      (1 + floor(random() * 110))::INTEGER,
      (1 + floor(random() * 1005))::INTEGER,
      'Bình luận ' || (i + 2),
      random_date('2025-01-01', '2025-04-25')
    );
  END LOOP;
END $$;

-- Fix để đảm bảo không gặp lỗi sequence
SELECT setval('assignments_assignment_id_seq', 22, true);
SELECT setval('attendance_attendance_id_seq', 10005, true);
SELECT setval('departments_department_id_seq', 3, true);
SELECT setval('documents_document_id_seq', 60, true);
SELECT setval('forumcomments_comment_id_seq', 208, true);
SELECT setval('forumposts_post_id_seq', 110, true);
SELECT setval('notifications_notification_id_seq', 5003, true);
SELECT setval('profiles_profile_id_seq', 1011, true);
SELECT setval('submissions_submission_id_seq', 2002, true);
SELECT setval('tasks_task_id_seq', 5011, true);
SELECT setval('trainingcourses_course_id_seq', 53, true);
SELECT setval('trainingpaths_training_path_id_seq', 12, true);
SELECT setval('usercourses_user_course_id_seq', 3003, true);
SELECT setval('users_user_id_seq', 1011, true);

-- Xóa các hàm tạm thời
DROP FUNCTION IF EXISTS random_string;
DROP FUNCTION IF EXISTS random_date;